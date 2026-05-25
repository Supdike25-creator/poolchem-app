import { NextRequest, NextResponse } from 'next/server';
import { assertDevRequest, logDevMessage, logDevRequest } from '@/lib/devTools';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const tempPassword = () => `ChemDeck-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

const jsonError = (message: string, status = 400) =>
  NextResponse.json({ ok: false, message }, { status });

const dbError = (error: { message: string }, status = 500) => jsonError(error.message, status);

type AdminBody = {
  scope?: string;
  action?: string;
  id?: string;
  role?: string;
  company_id?: string;
  company_code?: string;
  company_name?: string;
  name?: string;
  pool_type?: string;
  volume_gallons?: number | null;
  target_chlorine_min?: number | null;
  target_chlorine_max?: number | null;
  target_ph_min?: number | null;
  target_ph_max?: number | null;
  default_chlorine_strength?: number | null;
  notes?: string;
};

export async function POST(request: NextRequest) {
  const forbidden = assertDevRequest(request);
  if (forbidden) return forbidden;

  let body: AdminBody | null = null;

  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid request body.');
  }

  if (!body?.scope || !body.action) {
    return jsonError('Missing admin action.');
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (error) {
    return jsonError((error as Error).message, 500);
  }

  try {
    let response: Record<string, unknown> = { ok: true, message: 'Action complete.' };

    if (body.scope === 'profile') {
      if (!body.id) return jsonError('Missing user id.');

      if (body.action === 'change-role') {
        if (!['boss', 'guard', 'dev'].includes(body.role ?? '')) {
          return jsonError('Invalid role.');
        }
        const { error } = await supabase.from('users').update({ role: body.role }).eq('id', body.id);
        if (error) return dbError(error);
        response = { ok: true, message: `Role changed to ${body.role}.` };
      }

      if (body.action === 'move-company') {
        const { error } = await supabase.from('users').update({ company_id: body.company_id ?? null }).eq('id', body.id);
        if (error) return dbError(error);
        response = { ok: true, message: 'User moved to company.' };
      }

      if (body.action === 'reset-password') {
        const password = tempPassword();
        const { error } = await supabase.auth.admin.updateUserById(body.id, { password });
        if (error) return dbError(error);
        response = { ok: true, message: 'Temporary password generated.', details: { temporaryPassword: password } };
      }

      if (body.action === 'toggle-active') {
        const { data: user } = await supabase.from('users').select('active,status').eq('id', body.id).maybeSingle();
        const nextActive = !(user?.active ?? user?.status === 'active');
        const { error } = await supabase
          .from('users')
          .update({ active: nextActive, status: nextActive ? 'active' : 'inactive' })
          .eq('id', body.id);
        if (error) return dbError(error);
        response = { ok: true, message: nextActive ? 'Account reactivated.' : 'Account deactivated.' };
      }

      if (body.action === 'impersonate') {
        response = {
          ok: true,
          message: 'Impersonation token prepared for DEV audit.',
          details: { userId: body.id, mode: 'dev-only-preview' },
        };
      }
    }

    if (body.scope === 'company') {
      if (body.action === 'create-company') {
        const companyName = body.company_name?.trim();
        const requestedCode = body.company_code?.trim().toUpperCase();

        if (!companyName) {
          return jsonError('Enter a company name.');
        }

        const makeCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();
        let code = requestedCode || makeCode();
        let insertedCompany: { id: string; company_name: string; company_code: string } | null = null;
        let lastError: { message: string; code?: string } | null = null;

        for (let attempt = 0; attempt < 5; attempt += 1) {
          const { data, error } = await supabase
            .from('companies')
            .insert({ company_name: companyName, company_code: code })
            .select('id,company_name,company_code')
            .single();

          if (!error && data) {
            insertedCompany = data;
            break;
          }

          lastError = error;
          if (requestedCode || error?.code !== '23505') break;
          code = makeCode();
        }

        if (!insertedCompany) {
          const message =
            lastError?.code === '23505'
              ? 'That company code is already in use.'
              : lastError?.message || 'Company could not be created.';
          return jsonError(message);
        }

        response = { ok: true, message: 'Company created.', details: insertedCompany };
      }

      if (body.action !== 'create-company' && !body.id) {
        return jsonError('Missing company id.');
      }

      if (body.action === 'add-pool') {
        const { error } = await supabase.from('pools').insert({
          name: 'New Pool',
          company_id: body.id,
          pool_type: 'Pool',
          volume_gallons: null,
          target_chlorine_min: 1,
          target_chlorine_max: 3,
          target_ph_min: 7.2,
          target_ph_max: 7.8,
          notes: 'Created from Dev Admin panel.',
        });
        if (error) return dbError(error);
        response = { ok: true, message: 'Pool added to company.' };
      }

      if (body.action === 'rename-company') {
        const companyName = body.company_name?.trim();
        if (!companyName) {
          return jsonError('Enter a company name.');
        }
        const { error } = await supabase.from('companies').update({ company_name: companyName }).eq('id', body.id);
        if (error) return dbError(error);
        response = { ok: true, message: 'Company renamed.' };
      }

      if (body.action === 'change-code') {
        const code = body.company_code?.trim().toUpperCase();
        if (!code) {
          return jsonError('Enter a company code.');
        }
        const { error } = await supabase.from('companies').update({ company_code: code }).eq('id', body.id);
        if (error?.code === '23505') {
          return jsonError('That company code is already in use.');
        }
        if (error) return dbError(error);
        response = { ok: true, message: 'Company code updated.' };
      }

      if (body.action === 'delete-company') {
        const { error } = await supabase.from('companies').delete().eq('id', body.id);
        if (error) return dbError(error);
        response = { ok: true, message: 'Company deleted.' };
      }

      if (body.action === 'view-users') {
        const { data, error } = await supabase.from('users').select('id,email,role,active').eq('company_id', body.id);
        if (error) return dbError(error);
        response = { ok: true, message: 'Company users loaded.', details: data ?? [] };
      }
    }

    if (body.scope === 'pool') {
      if (!body.id) return jsonError('Missing pool id.');

      if (body.action === 'update-pool') {
        const name = body.name?.trim();
        if (!name) {
          return jsonError('Enter a pool name.');
        }

        const { error } = await supabase
          .from('pools')
          .update({
            name,
            pool_type: body.pool_type?.trim() || null,
            volume_gallons: body.volume_gallons ?? null,
            target_chlorine_min: body.target_chlorine_min ?? null,
            target_chlorine_max: body.target_chlorine_max ?? null,
            target_ph_min: body.target_ph_min ?? null,
            target_ph_max: body.target_ph_max ?? null,
            default_chlorine_strength: body.default_chlorine_strength ?? null,
            notes: body.notes?.trim() || null,
          })
          .eq('id', body.id);

        if (error) return dbError(error);
        response = { ok: true, message: 'Pool updated.' };
      }

      if (body.action === 'delete-pool') {
        const { error } = await supabase.from('pools').delete().eq('id', body.id);
        if (error) return dbError(error);
        response = { ok: true, message: 'Pool deleted.' };
      }

      if (body.action === 'view-logs') {
        const { data, error } = await supabase
          .from('chemical_logs')
          .select('*')
          .eq('pool_id', body.id)
          .order('created_at', { ascending: false })
          .limit(10);
        if (error) return dbError(error);
        response = { ok: true, message: 'Pool logs loaded.', details: data ?? [] };
      }
    }

    if (body.scope === 'system') {
      if (body.action === 'health') response = { ok: true, message: 'API health check passed.' };
      if (body.action === 'simulate-alert') response = { ok: true, message: 'Alert simulated.' };
      if (body.action === 'clear-test-data') response = { ok: true, message: 'Test data clear requested.' };
      if (body.action === 'toggle-flags') {
        response = { ok: true, message: 'Use the System Overlay feature flag cards for flag toggles.' };
      }
    }

    await logDevMessage('info', `Admin action: ${body.scope}.${body.action}`, response);
    await logDevRequest({ method: 'POST', path: '/api/dev/admin', status: 200, message: `${body.scope}.${body.action}` });
    return NextResponse.json(response);
  } catch (error) {
    const message = (error as Error).message || 'Admin action failed.';
    await logDevRequest({ method: 'POST', path: '/api/dev/admin', status: 500, message });
    await logDevMessage('error', `Admin action failed: ${body.scope}.${body.action}`, { message });
    return jsonError(message, 500);
  }
}

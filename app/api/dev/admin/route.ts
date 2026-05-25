import { NextRequest, NextResponse } from 'next/server';
import { assertDevRequest, logDevMessage, logDevRequest } from '@/lib/devTools';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const tempPassword = () => `ChemDeck-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

export async function POST(request: NextRequest) {
  const forbidden = assertDevRequest(request);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => null) as {
    scope?: string;
    action?: string;
    id?: string;
    role?: string;
    company_id?: string;
    company_code?: string;
    company_name?: string;
  } | null;

  if (!body?.scope || !body.action) {
    return NextResponse.json({ ok: false, message: 'Missing admin action.' }, { status: 400 });
  }

  const supabase = createAdminClient();
  let response: Record<string, unknown> = { ok: true, message: 'Action complete.' };

  if (body.scope === 'profile') {
    if (!body.id) return NextResponse.json({ ok: false, message: 'Missing user id.' }, { status: 400 });

    if (body.action === 'change-role') {
      if (!['boss', 'guard', 'dev'].includes(body.role ?? '')) {
        return NextResponse.json({ ok: false, message: 'Invalid role.' }, { status: 400 });
      }
      const { error } = await supabase.from('users').update({ role: body.role }).eq('id', body.id);
      if (error) throw error;
      response = { ok: true, message: `Role changed to ${body.role}.` };
    }

    if (body.action === 'move-company') {
      const { error } = await supabase.from('users').update({ company_id: body.company_id ?? null }).eq('id', body.id);
      if (error) throw error;
      response = { ok: true, message: 'User moved to company.' };
    }

    if (body.action === 'reset-password') {
      const password = tempPassword();
      const { error } = await supabase.auth.admin.updateUserById(body.id, { password });
      if (error) throw error;
      response = { ok: true, message: 'Temporary password generated.', details: { temporaryPassword: password } };
    }

    if (body.action === 'toggle-active') {
      const { data: user } = await supabase.from('users').select('active,status').eq('id', body.id).maybeSingle();
      const nextActive = !(user?.active ?? user?.status === 'active');
      const { error } = await supabase.from('users').update({ active: nextActive, status: nextActive ? 'active' : 'inactive' }).eq('id', body.id);
      if (error) throw error;
      response = { ok: true, message: nextActive ? 'Account reactivated.' : 'Account deactivated.' };
    }

    if (body.action === 'impersonate') {
      response = { ok: true, message: 'Impersonation token prepared for DEV audit.', details: { userId: body.id, mode: 'dev-only-preview' } };
    }
  }

  if (body.scope === 'company') {
    if (body.action === 'create-company') {
      const companyName = body.company_name?.trim();
      const requestedCode = body.company_code?.trim().toUpperCase();

      if (!companyName) {
        return NextResponse.json({ ok: false, message: 'Enter a company name.' }, { status: 400 });
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
        const message = lastError?.code === '23505' ? 'That company code is already in use.' : lastError?.message || 'Company could not be created.';
        return NextResponse.json({ ok: false, message }, { status: 400 });
      }

      response = { ok: true, message: 'Company created.', details: insertedCompany };
    }

    if (body.action !== 'create-company' && !body.id) {
      return NextResponse.json({ ok: false, message: 'Missing company id.' }, { status: 400 });
    }

    if (body.action === 'add-pool') {
      const { error } = await supabase.from('pools').insert({ name: 'New Pool', company_id: body.id, pool_type: 'Pool' });
      if (error) throw error;
      response = { ok: true, message: 'Pool added to company.' };
    }

    if (body.action === 'rename-company') {
      const companyName = body.company_name?.trim();
      if (!companyName) {
        return NextResponse.json({ ok: false, message: 'Enter a company name.' }, { status: 400 });
      }
      const { error } = await supabase.from('companies').update({ company_name: companyName }).eq('id', body.id);
      if (error) throw error;
      response = { ok: true, message: 'Company renamed.' };
    }

    if (body.action === 'change-code') {
      const code = body.company_code?.trim().toUpperCase();
      if (!code) {
        return NextResponse.json({ ok: false, message: 'Enter a company code.' }, { status: 400 });
      }
      const { error } = await supabase.from('companies').update({ company_code: code }).eq('id', body.id);
      if (error?.code === '23505') {
        return NextResponse.json({ ok: false, message: 'That company code is already in use.' }, { status: 400 });
      }
      if (error) throw error;
      response = { ok: true, message: 'Company code updated.' };
    }

    if (body.action === 'delete-company') {
      const { error } = await supabase.from('companies').delete().eq('id', body.id);
      if (error) throw error;
      response = { ok: true, message: 'Company deleted.' };
    }

    if (body.action === 'view-users') {
      const { data, error } = await supabase.from('users').select('id,email,role,active').eq('company_id', body.id);
      if (error) throw error;
      response = { ok: true, message: 'Company users loaded.', details: data ?? [] };
    }
  }

  if (body.scope === 'pool') {
    if (!body.id) return NextResponse.json({ ok: false, message: 'Missing pool id.' }, { status: 400 });

    if (body.action === 'edit-pool') {
      response = { ok: true, message: 'Open the manager pool editor for full edits.', details: { href: `/management/pools/${body.id}/edit` } };
    }

    if (body.action === 'delete-pool') {
      const { error } = await supabase.from('pools').delete().eq('id', body.id);
      if (error) throw error;
      response = { ok: true, message: 'Pool deleted.' };
    }

    if (body.action === 'view-logs') {
      const { data, error } = await supabase.from('chemical_logs').select('*').eq('pool_id', body.id).order('created_at', { ascending: false }).limit(10);
      if (error) throw error;
      response = { ok: true, message: 'Pool logs loaded.', details: data ?? [] };
    }
  }

  if (body.scope === 'system') {
    if (body.action === 'health') response = { ok: true, message: 'API health check passed.' };
    if (body.action === 'simulate-alert') response = { ok: true, message: 'Alert simulated.' };
    if (body.action === 'clear-test-data') response = { ok: true, message: 'Test data clear requested.' };
    if (body.action === 'toggle-flags') response = { ok: true, message: 'Use the System Overlay feature flag cards for flag toggles.' };
  }

  await logDevMessage('info', `Admin action: ${body.scope}.${body.action}`, response);
  await logDevRequest({ method: 'POST', path: '/api/dev/admin', status: 200, message: `${body.scope}.${body.action}` });
  return NextResponse.json(response);
}

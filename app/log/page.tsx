'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import BackButton from '../../components/BackButton';
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Droplets,
  Eye,
  FlaskConical,
  Minus,
  Plus,
  RotateCcw,
  Trash2,
  Waves,
} from 'lucide-react';

interface Pool {
  id: string;
  name: string;
  volume_gallons?: number | null;
  pool_type?: string | null;
  is_baby_pool?: boolean | null;
  target_chlorine_min?: number | null;
  target_chlorine_max?: number | null;
  target_ph_min?: number | null;
  target_ph_max?: number | null;
  default_chlorine_type?: string | null;
  default_chlorine_strength?: number | null;
  max_single_dose_oz?: number | null;
  retest_minutes?: number | null;
}

interface FormData {
  poolId: string;
  freeChlorine: string;
  ph: string;
  notes: string;
  photo: File | null;
}

type Step = 'pool' | 'chlorine' | 'ph' | 'photo' | 'review' | 'submit';

const getDefaultPoolVolume = () => {
  if (typeof window === 'undefined') {
    return 0;
  }

  try {
    const savedSettings = localStorage.getItem('chemdeck-settings');
    const volume = savedSettings ? Number(JSON.parse(savedSettings)?.poolVolumeGallons) : 0;
    return Number.isFinite(volume) && volume > 0 ? volume : 0;
  } catch {
    return 0;
  }
};

const calculateChlorineDose = (
  poolVolume: number,
  currentChlorine: number,
  targetChlorineMin: number,
  targetChlorineMax: number,
  chlorineStrength: number,
  isBabyPool: boolean,
  maxSingleDoseOz: number
): { doseOunces: number; needsChlorine: boolean; warnings: string[]; status: 'no-dose' | 'do-not-add' | 'add' } => {
  const warnings: string[] = [];

  if (poolVolume <= 0) {
    warnings.push('Pool volume is missing. Unable to calculate dose.');
    return { doseOunces: 0, needsChlorine: false, warnings, status: 'no-dose' };
  }

  if (currentChlorine >= targetChlorineMax) {
    warnings.push('Chlorine is above target. Do not add chlorine.');
    return { doseOunces: 0, needsChlorine: false, warnings, status: 'do-not-add' };
  }

  if (currentChlorine >= targetChlorineMin && currentChlorine < targetChlorineMax) {
    return { doseOunces: 0, needsChlorine: false, warnings: ['Chlorine is within target range. No dosing needed.'], status: 'no-dose' };
  }

  if (chlorineStrength < 5 || chlorineStrength > 15) {
    warnings.push('Chlorine strength is not within the recommended admin range.');
  }

  const deficit = Math.max(0, targetChlorineMin - currentChlorine);
  if (deficit === 0) {
    return { doseOunces: 0, needsChlorine: false, warnings, status: 'no-dose' };
  }

  const doseOunces = (deficit * poolVolume * 7.5) / (chlorineStrength / 100) / 128;

  if (doseOunces <= 0) {
    return { doseOunces: 0, needsChlorine: false, warnings, status: 'no-dose' };
  }

  if (doseOunces > maxSingleDoseOz) {
    warnings.push(`Calculated dose exceeds the pool's max single dose (${maxSingleDoseOz.toFixed(0)} oz). Use a smaller initial dose and retest.`);
  }

  if (isBabyPool && doseOunces > maxSingleDoseOz) {
    warnings.push('Baby pool dosing is stricter. Follow the baby pool max dose and consult a supervisor if needed.');
  }

  return { doseOunces, needsChlorine: true, warnings, status: 'add' };
};

const getChlorineStatus = (chlorine: number): { status: string; color: string; tone: 'danger' | 'success' | 'neutral' } => {
  if (chlorine < 1.0) return { status: 'Too Low', color: 'text-red-600', tone: 'danger' };
  if (chlorine > 5.0) return { status: 'Too High', color: 'text-red-600', tone: 'danger' };
  if (chlorine >= 1.0 && chlorine <= 5.0) return { status: 'Good', color: 'text-green-600', tone: 'success' };
  return { status: 'Unknown', color: 'text-slate-600', tone: 'neutral' };
};

const getPhStatus = (ph: number): { status: string; color: string; tone: 'danger' | 'success' | 'neutral' } => {
  if (ph < 7.2) return { status: 'Too Low', color: 'text-red-600', tone: 'danger' };
  if (ph > 7.8) return { status: 'Too High', color: 'text-red-600', tone: 'danger' };
  if (ph >= 7.2 && ph <= 7.8) return { status: 'Good', color: 'text-green-600', tone: 'success' };
  return { status: 'Unknown', color: 'text-slate-600', tone: 'neutral' };
};

export default function LogPage() {
  const [currentStep, setCurrentStep] = useState<Step>('pool');
  const [formData, setFormData] = useState<FormData>({
    poolId: '',
    freeChlorine: '',
    ph: '',
    notes: '',
    photo: null
  });
  const [pools, setPools] = useState<Pool[]>([]);
  const [loadingPools, setLoadingPools] = useState(true);
  const [poolLoadError, setPoolLoadError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [photoKey, setPhotoKey] = useState(0);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [defaultPoolVolume, setDefaultPoolVolume] = useState(getDefaultPoolVolume);

  useEffect(() => {
    const loadPools = async () => {
      setLoadingPools(true);

      try {
        const supabase = createClient();

        // Get current user's organization
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setPoolLoadError('Unauthorized');
          setPools([]);
          setLoadingPools(false);
          return;
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', session.user.id)
          .single();

        if (!profileData?.organization_id) {
          setPoolLoadError('No organization found');
          setPools([]);
          setLoadingPools(false);
          return;
        }

        const { data, error } = await supabase
          .from('pools')
          .select(
            'id,name,volume_gallons,pool_type,is_baby_pool,target_chlorine_min,target_chlorine_max,target_ph_min,target_ph_max,default_chlorine_type,default_chlorine_strength,max_single_dose_oz,retest_minutes'
          )
          .eq('organization_id', profileData.organization_id)
          .order('name');

        if (error) {
          const message = typeof error.message === 'string' ? error.message : String(error);
          setPoolLoadError(`Unable to load pools from Supabase: ${message}`);
          setPools([]);
        } else {
          setPools(data || []);
        }
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : String(loadError);
        setPoolLoadError(`Unable to load pools from Supabase: ${message}`);
        setPools([]);
      }

      setLoadingPools(false);
    };

    loadPools();
  }, []);

  useEffect(() => {
    const syncDefaultPoolVolume = () => setDefaultPoolVolume(getDefaultPoolVolume());

    window.addEventListener('storage', syncDefaultPoolVolume);
    window.addEventListener('chemdeck-settings-change', syncDefaultPoolVolume);

    return () => {
      window.removeEventListener('storage', syncDefaultPoolVolume);
      window.removeEventListener('chemdeck-settings-change', syncDefaultPoolVolume);
    };
  }, []);

  useEffect(() => {
    if (!formData.photo) {
      setPhotoPreviewUrl('');
      return;
    }

    const url = URL.createObjectURL(formData.photo);
    setPhotoPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [formData.photo]);

  const handleInputChange = (field: keyof FormData, value: string | File | null | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleInputChange('photo', file);
  };

  const clearPhoto = () => {
    handleInputChange('photo', null);
    setPhotoKey((prev) => prev + 1);
  };

  const adjustNumberField = (field: 'freeChlorine' | 'ph', delta: number, precision = 1) => {
    const fallback = field === 'ph' ? '7.4' : '0';
    const current = Number.parseFloat(formData[field] || fallback);
    const next = Math.max(0, current + delta);
    handleInputChange(field, next.toFixed(precision));
  };

  const nextStep = () => {
    const steps: Step[] = ['pool', 'chlorine', 'ph', 'photo', 'review', 'submit'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: Step[] = ['pool', 'chlorine', 'ph', 'photo', 'review', 'submit'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setSubmitError('Unauthorized');
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from('chemical_logs').insert([
        {
          pool_id: formData.poolId,
          submitted_by: session.user.id,
          free_chlorine: Number(formData.freeChlorine),
          ph: Number(formData.ph),
          notes: formData.notes,
          photo_url: null,
          dosing_amount: dosingResult.needsChlorine ? Number(dosingResult.doseOunces.toFixed(2)) : null,
          dosing_unit: dosingResult.needsChlorine ? 'oz' : null,
          dosing_chemical: selectedPool?.default_chlorine_type || 'chlorine',
          dosing_recommendation: dosingResult.status === 'do-not-add'
            ? 'Do not add chlorine'
            : dosingResult.needsChlorine
            ? `Add ${dosingResult.doseOunces.toFixed(1)} oz ${selectedPool?.default_chlorine_type || 'chlorine'}`
            : 'No chlorine needed',
        }
      ]);

      if (error) {
        const message = typeof error.message === 'string' ? error.message : String(error);
        setSubmitError(`Unable to submit chemical log: ${message}`);
      } else {
        setSubmitMessage('Chemical log submitted successfully!');
        setFormData({
          poolId: '',
          freeChlorine: '',
          ph: '',
          notes: '',
          photo: null
        });
        setPhotoKey((prev) => prev + 1);
        setCurrentStep('pool');
        setTimeout(() => setSubmitMessage(''), 3000);
      }

      setIsSubmitting(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSubmitError(`Unable to submit chemical log: ${message}`);
      setIsSubmitting(false);
    }
  };

  const selectedPool = pools.find((p) => p.id === formData.poolId);
  const chlorineValue = parseFloat(formData.freeChlorine) || 0;
  const phValue = parseFloat(formData.ph) || 0;

  const poolVolumeValue = selectedPool?.volume_gallons ?? defaultPoolVolume;
  const targetChlorineMinValue = selectedPool?.target_chlorine_min ?? 3.0;
  const targetChlorineMaxValue = selectedPool?.target_chlorine_max ?? 5.0;
  const chlorineStrengthValue = selectedPool?.default_chlorine_strength ?? 10;
  const isBabyPool = selectedPool?.is_baby_pool ?? false;
  const maxSingleDoseOz = selectedPool?.max_single_dose_oz ?? (isBabyPool ? 32 : 128);

  const dosingResult = calculateChlorineDose(
    poolVolumeValue,
    chlorineValue,
    targetChlorineMinValue,
    targetChlorineMaxValue,
    chlorineStrengthValue,
    isBabyPool,
    maxSingleDoseOz
  );
  const isOutOfRange = Boolean(formData.freeChlorine && (chlorineValue < 1.0 || chlorineValue > 5.0)) || Boolean(formData.ph && (phValue < 7.2 || phValue > 7.8));
  const photoRequirementMessage = isBabyPool
    ? 'Photo required for baby pools.'
    : isOutOfRange
    ? 'Photo required for out-of-range readings.'
    : 'Photo optional for normal tests.';

  const renderStepIndicator = () => {
    const steps = [
      { key: 'pool', label: 'Pool', icon: Waves },
      { key: 'chlorine', label: 'Chlorine', icon: Droplets },
      { key: 'ph', label: 'pH', icon: FlaskConical },
      { key: 'photo', label: 'Photo', icon: Camera },
      { key: 'review', label: 'Review', icon: ClipboardCheck }
    ];

    return (
      <div className="flex justify-between mb-8 px-4">
        {steps.map((step, index) => {
          const isActive = currentStep === step.key;
          const isCompleted = steps.findIndex(s => s.key === currentStep) > index;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex flex-col items-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg mb-2 transition-colors ${
                isCompleted ? 'bg-green-600 text-white' :
                isActive ? 'bg-blue-600 text-white' :
                'bg-slate-100 text-slate-400'
              }`}>
                {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span className={`text-xs font-medium ${
                isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-slate-400'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderPoolStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Pool</h2>
        <p className="text-gray-600">Choose the pool you&apos;re testing</p>
      </div>

      <div className="space-y-4">
        {loadingPools ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading pools...</p>
          </div>
        ) : poolLoadError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{poolLoadError}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {pools.map((pool) => (
              <button
                key={pool.id}
                onClick={() => handleInputChange('poolId', pool.id)}
                data-sound="click"
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  formData.poolId === pool.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900">{pool.name}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={nextStep}
        disabled={!formData.poolId}
        data-sound="click"
        className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
      >
        Next: Test Chlorine
      </button>
    </div>
  );

  const renderChlorineStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Free Chlorine Test</h2>
        <p className="text-gray-600">Test the pool&apos;s free chlorine level</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 text-sm">
          <strong>Safe range:</strong> 1.0 - 5.0 ppm<br/>
          <strong>Ideal range:</strong> 2.0 - 4.0 ppm
        </p>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="text-lg font-medium text-gray-900 mb-2 block">Free Chlorine (ppm)</span>
          <div className="grid grid-cols-[56px_1fr_56px] items-center gap-3">
            <button
              type="button"
              onClick={() => adjustNumberField('freeChlorine', -0.1)}
              className="flex h-14 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
              aria-label="Decrease free chlorine"
            >
              <Minus className="h-5 w-5" />
            </button>
            <input
              type="number"
              step="0.1"
              min="0"
              max="20"
              value={formData.freeChlorine}
              onChange={(e) => handleInputChange('freeChlorine', e.target.value)}
              className="w-full text-center text-3xl font-bold py-6 px-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-0"
              placeholder="0.0"
            />
            <button
              type="button"
              onClick={() => adjustNumberField('freeChlorine', 0.1)}
              className="flex h-14 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
              aria-label="Increase free chlorine"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </label>

        {formData.freeChlorine && (
          <div className="text-center">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${getChlorineStatus(chlorineValue).tone === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {getChlorineStatus(chlorineValue).tone === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {getChlorineStatus(chlorineValue).status}
            </div>
          </div>
        )}

        {(chlorineValue < 1.0 || chlorineValue > 5.0) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="mr-3 h-5 w-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">Chemistry Out of Range</p>
                <p className="text-red-700 text-sm">
                  {chlorineValue < 1.0
                    ? 'Chlorine is below target. Review the dosing recommendation and notify a manager if the pool is unsafe.'
                    : 'Do not add chlorine. Chlorine is already above target. Retest later and notify a manager if it stays high.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex space-x-4">
        <button
          onClick={prevStep}
          data-sound="back"
          className="flex-1 bg-gray-200 text-gray-800 py-4 px-6 rounded-lg font-semibold text-lg hover:bg-gray-300 transition-colors"
        >
          Back
        </button>
        <button
          onClick={nextStep}
          disabled={!formData.freeChlorine}
          data-sound="click"
          className="flex-1 bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          Next: Test pH
        </button>
      </div>
    </div>
  );

  const renderPhStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">pH Test</h2>
        <p className="text-gray-600">Test the pool&apos;s pH level</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 text-sm">
          <strong>Safe range:</strong> 7.2 - 7.8<br/>
          <strong>Ideal range:</strong> 7.4 - 7.6
        </p>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="text-lg font-medium text-gray-900 mb-2 block">pH Level</span>
          <div className="grid grid-cols-[56px_1fr_56px] items-center gap-3">
            <button
              type="button"
              onClick={() => adjustNumberField('ph', -0.1)}
              className="flex h-14 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
              aria-label="Decrease pH"
            >
              <Minus className="h-5 w-5" />
            </button>
            <input
              type="number"
              step="0.1"
              min="0"
              max="14"
              value={formData.ph}
              onChange={(e) => handleInputChange('ph', e.target.value)}
              className="w-full text-center text-3xl font-bold py-6 px-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-0"
              placeholder="7.4"
            />
            <button
              type="button"
              onClick={() => adjustNumberField('ph', 0.1)}
              className="flex h-14 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
              aria-label="Increase pH"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </label>

        {formData.ph && (
          <div className="text-center">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${getPhStatus(phValue).tone === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {getPhStatus(phValue).tone === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {getPhStatus(phValue).status}
            </div>
          </div>
        )}

        {(phValue < 7.2 || phValue > 7.8) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="mr-3 h-5 w-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">pH Out of Range</p>
                <p className="text-red-700 text-sm">
                  {phValue < 7.2
                    ? 'pH is too low. Add pH increaser (soda ash).'
                    : 'pH is too high. Add pH decreaser (muriatic acid).'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex space-x-4">
        <button
          onClick={prevStep}
          data-sound="back"
          className="flex-1 bg-gray-200 text-gray-800 py-4 px-6 rounded-lg font-semibold text-lg hover:bg-gray-300 transition-colors"
        >
          Back
        </button>
        <button
          onClick={nextStep}
          disabled={!formData.ph}
          data-sound="click"
          className="flex-1 bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          Next: Add Photo
        </button>
      </div>
    </div>
  );

  const renderPhotoStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Photo Verification</h2>
        <p className="text-gray-600">Attach evidence and add any field notes.</p>
      </div>

      <div className="space-y-4">
        <div className={`rounded-lg border p-4 ${isBabyPool || isOutOfRange ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-blue-200 bg-blue-50 text-blue-800'}`}>
          <div className="flex items-start gap-3">
            <Camera className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{photoRequirementMessage}</p>
          </div>
          {/* TODO: Persist and enforce workspace photo rules once the Supabase settings schema exists. */}
        </div>

        <label className="block">
          <span className="text-lg font-medium text-gray-900 mb-2 block">Notes (Optional)</span>
          <textarea
            rows={4}
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-0 text-lg"
            placeholder="Any observations, actions taken, or issues noted..."
          />
        </label>

        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <span className="text-lg font-medium text-gray-900">Photo</span>
              <p className="mt-1 text-sm text-gray-600">Take or upload a clear photo of the test result.</p>
            </div>
            <Camera className="h-5 w-5 text-slate-500" />
          </div>
          <input
            key={photoKey}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
          />
          {formData.photo && (
            <div className="mt-4 rounded-lg border border-green-200 bg-white p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-green-700">Photo attached: {formData.photo.name}</p>
                <div className="flex flex-wrap gap-2">
                  {photoPreviewUrl ? (
                    <a href={photoPreviewUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                      <Eye className="h-4 w-4" />
                      View Photo
                    </a>
                  ) : null}
                  <button type="button" onClick={() => setPhotoKey((prev) => prev + 1)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                    <RotateCcw className="h-4 w-4" />
                    Retake
                  </button>
                  <button type="button" onClick={clearPhoto} className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-100">
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </div>
              {photoPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreviewUrl} alt="Chemical test preview" className="mt-3 max-h-56 w-full rounded-lg object-cover" />
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={prevStep}
          data-sound="back"
          className="flex-1 bg-gray-200 text-gray-800 py-4 px-6 rounded-lg font-semibold text-lg hover:bg-gray-300 transition-colors"
        >
          Back
        </button>
        <button
          onClick={nextStep}
          data-sound="click"
          className="flex-1 bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
        >
          Next: Review
        </button>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Recommendation</h2>
        <p className="text-gray-600">Review readings and safe dosing guidance before submitting.</p>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-900">Pool:</span>
          <span className="text-gray-700">{selectedPool?.name}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-900">Free Chlorine:</span>
          <span className={`font-bold ${getChlorineStatus(chlorineValue).color}`}>
            {chlorineValue} ppm
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-900">pH:</span>
          <span className={`font-bold ${getPhStatus(phValue).color}`}>
            {phValue}
          </span>
        </div>
        {formData.notes && (
          <div className="pt-2 border-t border-gray-200">
            <span className="font-semibold text-gray-900">Notes:</span>
            <p className="text-gray-700 mt-1">{formData.notes}</p>
          </div>
        )}
      </div>

      {/* Dosing Calculator */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-blue-900">Recommendation</h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-white p-4 border border-blue-200">
            <span className="text-sm font-medium text-blue-800">Pool Volume</span>
            <p className="mt-2 text-lg font-semibold text-gray-900">
              {poolVolumeValue ? `${poolVolumeValue.toLocaleString()} gal` : 'Not configured'}
            </p>
          </div>
          <div className="rounded-lg bg-white p-4 border border-blue-200">
            <span className="text-sm font-medium text-blue-800">Chlorine Target</span>
            <p className="mt-2 text-lg font-semibold text-gray-900">
              {targetChlorineMinValue.toFixed(1)} - {targetChlorineMaxValue.toFixed(1)} ppm
            </p>
          </div>
          <div className="rounded-lg bg-white p-4 border border-blue-200">
            <span className="text-sm font-medium text-blue-800">Chlorine Strength</span>
            <p className="mt-2 text-lg font-semibold text-gray-900">
              {chlorineStrengthValue}%
            </p>
          </div>
          <div className="rounded-lg bg-white p-4 border border-blue-200">
            <span className="text-sm font-medium text-blue-800">Pool Type</span>
            <p className="mt-2 text-lg font-semibold text-gray-900">
              {selectedPool?.pool_type || (isBabyPool ? 'Baby Pool' : 'Standard')}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-blue-300">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-blue-900">Recommended Dose</span>
            <span className="text-2xl font-bold text-blue-600">
              {dosingResult.status === 'do-not-add'
                ? 'Do not add chlorine'
                : dosingResult.doseOunces === 0
                ? 'No chlorine needed'
                : dosingResult.doseOunces >= 16
                ? `${(dosingResult.doseOunces / 16).toFixed(1)} lbs`
                : `${dosingResult.doseOunces.toFixed(1)} oz`}
            </span>
          </div>

          {dosingResult.warnings.length > 0 && (
            <div className="space-y-1">
              {dosingResult.warnings.map((warning, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                  <p className="text-orange-700 text-sm">{warning}</p>
                </div>
              ))}
            </div>
          )}
          {!poolVolumeValue ? (
            <p className="mt-3 text-sm text-blue-800">
              Dosing recommendation will appear here once pool volume and chemical settings are configured.
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={prevStep}
          data-sound="back"
          className="flex-1 bg-gray-200 text-gray-800 py-4 px-6 rounded-lg font-semibold text-lg hover:bg-gray-300 transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => setCurrentStep('submit')}
          data-sound="click"
          className="flex-1 bg-green-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors"
        >
          Submit Log
        </button>
      </div>
    </div>
  );

  const renderSubmitStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirm Submission</h2>
        <p className="text-gray-600">Review and submit your chemical log</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <ClipboardList className="mx-auto mb-4 h-12 w-12 text-slate-500" />
          <p className="text-lg text-gray-700">
            Ready to submit chemical log for <strong>{selectedPool?.name}</strong>?
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          data-sound="success"
          className="w-full bg-green-600 text-white py-6 px-6 rounded-lg font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-colors flex items-center justify-center space-x-3"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5" />
              <span>Submit Chemical Log</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={prevStep}
          data-sound="back"
          className="w-full bg-gray-200 text-gray-800 py-4 px-6 rounded-lg font-semibold text-lg hover:bg-gray-300 transition-colors"
        >
          Back to Review
        </button>
      </form>

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{submitError}</p>
        </div>
      )}

      {submitMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="text-green-700 font-medium">{submitMessage}</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="mb-4">
          <BackButton fallbackHref="/dashboard" label="Back" />
        </div>
        {renderStepIndicator()}

        <div className="bg-white rounded-xl shadow-lg p-5 mb-6">
          {currentStep === 'pool' && renderPoolStep()}
          {currentStep === 'chlorine' && renderChlorineStep()}
          {currentStep === 'ph' && renderPhStep()}
          {currentStep === 'photo' && renderPhotoStep()}
          {currentStep === 'review' && renderReviewStep()}
          {currentStep === 'submit' && renderSubmitStep()}
        </div>
      </div>
    </div>
  );
}

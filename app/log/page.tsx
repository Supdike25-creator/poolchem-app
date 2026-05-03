'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

interface Pool {
  id: string;
  name: string;
}

interface FormData {
  poolId: string;
  freeChlorine: string;
  ph: string;
  notes: string;
  photo: File | null;
  poolVolume: string;
  targetChlorine: string;
  chlorineStrength: string;
  isBabyPool: boolean;
}

type Step = 'pool' | 'chlorine' | 'ph' | 'notes' | 'review' | 'submit';

const calculateChlorineDose = (
  poolVolume: number,
  currentChlorine: number,
  targetChlorine: number,
  chlorineStrength: number,
  isBabyPool: boolean
): { dose: number; warnings: string[] } => {
  const warnings: string[] = [];

  // Safety checks
  if (currentChlorine > 5.0) {
    warnings.push('Chlorine levels are dangerously high. Do not add more chlorine.');
    return { dose: 0, warnings };
  }

  if (currentChlorine < 0.5) {
    warnings.push('Chlorine levels are critically low. Shock treatment recommended.');
  }

  if (targetChlorine > 5.0) {
    warnings.push('Target chlorine level is too high for safe swimming.');
  }

  if (chlorineStrength < 5 || chlorineStrength > 15) {
    warnings.push('Chlorine strength should be between 5-15% for accurate dosing.');
  }

  // Calculate deficit
  const deficit = Math.max(0, targetChlorine - currentChlorine);

  if (deficit === 0) {
    return { dose: 0, warnings: ['Chlorine levels are already at or above target.'] };
  }

  // Calculate dose in ounces
  // Formula: (deficit * poolVolume * 7.5) / (chlorineStrength * 100) * 128
  const doseOunces = (deficit * poolVolume * 7.5) / (chlorineStrength / 100) / 128;

  // Convert to pounds for larger doses
  let dose = doseOunces;
  let unit = 'ounces';

  if (doseOunces >= 16) {
    dose = doseOunces / 16;
    unit = 'pounds';
  }

  // Baby pool safety limit
  if (isBabyPool && dose > 2) {
    warnings.push('Calculated dose exceeds safe limit for baby pools (2 lbs max). Consult supervisor.');
  }

  // General safety limit
  if (dose > 8) {
    warnings.push('Calculated dose is very high. Consider splitting into multiple applications.');
  }

  return { dose, warnings };
};

const getChlorineStatus = (chlorine: number): { status: string; color: string; icon: string } => {
  if (chlorine < 1.0) return { status: 'Too Low', color: 'text-red-600', icon: '⚠️' };
  if (chlorine > 5.0) return { status: 'Too High', color: 'text-red-600', icon: '🚨' };
  if (chlorine >= 1.0 && chlorine <= 5.0) return { status: 'Good', color: 'text-green-600', icon: '✅' };
  return { status: 'Unknown', color: 'text-gray-600', icon: '❓' };
};

const getPhStatus = (ph: number): { status: string; color: string; icon: string } => {
  if (ph < 7.2) return { status: 'Too Low', color: 'text-red-600', icon: '⚠️' };
  if (ph > 7.8) return { status: 'Too High', color: 'text-red-600', icon: '🚨' };
  if (ph >= 7.2 && ph <= 7.8) return { status: 'Good', color: 'text-green-600', icon: '✅' };
  return { status: 'Unknown', color: 'text-gray-600', icon: '❓' };
};

export default function LogPage() {
  const [currentStep, setCurrentStep] = useState<Step>('pool');
  const [formData, setFormData] = useState<FormData>({
    poolId: '',
    freeChlorine: '',
    ph: '',
    notes: '',
    photo: null,
    poolVolume: '',
    targetChlorine: '3.0',
    chlorineStrength: '10',
    isBabyPool: false
  });
  const [pools, setPools] = useState<Pool[]>([]);
  const [loadingPools, setLoadingPools] = useState(true);
  const [poolLoadError, setPoolLoadError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [photoKey, setPhotoKey] = useState(0);

  useEffect(() => {
    const loadPools = async () => {
      setLoadingPools(true);

      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.from('pools').select('id,name').order('name');

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

  const nextStep = () => {
    const steps: Step[] = ['pool', 'chlorine', 'ph', 'notes', 'review', 'submit'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: Step[] = ['pool', 'chlorine', 'ph', 'notes', 'review', 'submit'];
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
      const chlorineValue = parseFloat(formData.freeChlorine);
      const phValue = parseFloat(formData.ph);

      const supabase = getSupabaseClient();
      const { error } = await supabase.from('chemical_logs').insert([
        {
          pool_id: formData.poolId,
          free_chlorine: chlorineValue,
          ph: phValue,
          notes: formData.notes,
          photo_url: null
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
          photo: null,
          poolVolume: '',
          targetChlorine: '3.0',
          chlorineStrength: '10',
          isBabyPool: false
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

  const selectedPool = pools.find(p => p.id === formData.poolId);
  const chlorineValue = parseFloat(formData.freeChlorine) || 0;
  const phValue = parseFloat(formData.ph) || 0;
  const poolVolumeValue = parseFloat(formData.poolVolume) || 0;
  const targetChlorineValue = parseFloat(formData.targetChlorine) || 3.0;
  const chlorineStrengthValue = parseFloat(formData.chlorineStrength) || 10;

  const dosingResult = calculateChlorineDose(
    poolVolumeValue,
    chlorineValue,
    targetChlorineValue,
    chlorineStrengthValue,
    formData.isBabyPool
  );

  const renderStepIndicator = () => {
    const steps = [
      { key: 'pool', label: 'Pool', icon: '🏊' },
      { key: 'chlorine', label: 'Chlorine', icon: '💧' },
      { key: 'ph', label: 'pH', icon: '🧪' },
      { key: 'notes', label: 'Notes', icon: '📝' },
      { key: 'review', label: 'Review', icon: '✅' }
    ];

    return (
      <div className="flex justify-between mb-8 px-4">
        {steps.map((step, index) => {
          const isActive = currentStep === step.key;
          const isCompleted = steps.findIndex(s => s.key === currentStep) > index;

          return (
            <div key={step.key} className="flex flex-col items-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg mb-2 transition-colors ${
                isCompleted ? 'bg-green-500 text-white' :
                isActive ? 'bg-blue-500 text-white' :
                'bg-gray-200 text-gray-400'
              }`}>
                {isCompleted ? '✓' : step.icon}
              </div>
              <span className={`text-xs font-medium ${
                isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
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
        <p className="text-gray-600">Choose the pool you're testing</p>
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
        <p className="text-gray-600">Test the pool's free chlorine level</p>
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
        </label>

        {formData.freeChlorine && (
          <div className="text-center">
            <div className={`text-2xl font-bold ${getChlorineStatus(chlorineValue).color}`}>
              {getChlorineStatus(chlorineValue).icon} {getChlorineStatus(chlorineValue).status}
            </div>
          </div>
        )}

        {(chlorineValue < 1.0 || chlorineValue > 5.0) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-red-600 text-xl mr-3">⚠️</span>
              <div>
                <p className="font-semibold text-red-800">Chemistry Out of Range</p>
                <p className="text-red-700 text-sm">
                  {chlorineValue < 1.0
                    ? 'Chlorine is too low. Immediate shock treatment required.'
                    : 'Chlorine is too high. Allow to dissipate naturally.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex space-x-4">
        <button
          onClick={prevStep}
          className="flex-1 bg-gray-200 text-gray-800 py-4 px-6 rounded-lg font-semibold text-lg hover:bg-gray-300 transition-colors"
        >
          Back
        </button>
        <button
          onClick={nextStep}
          disabled={!formData.freeChlorine}
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
        <p className="text-gray-600">Test the pool's pH level</p>
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
        </label>

        {formData.ph && (
          <div className="text-center">
            <div className={`text-2xl font-bold ${getPhStatus(phValue).color}`}>
              {getPhStatus(phValue).icon} {getPhStatus(phValue).status}
            </div>
          </div>
        )}

        {(phValue < 7.2 || phValue > 7.8) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-red-600 text-xl mr-3">⚠️</span>
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
          className="flex-1 bg-gray-200 text-gray-800 py-4 px-6 rounded-lg font-semibold text-lg hover:bg-gray-300 transition-colors"
        >
          Back
        </button>
        <button
          onClick={nextStep}
          disabled={!formData.ph}
          className="flex-1 bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          Next: Add Notes
        </button>
      </div>
    </div>
  );

  const renderNotesStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Notes & Photo</h2>
        <p className="text-gray-600">Add any observations or photos</p>
      </div>

      <div className="space-y-4">
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

        <label className="block">
          <span className="text-lg font-medium text-gray-900 mb-2 block">Photo (Optional)</span>
          <input
            key={photoKey}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="w-full p-4 border-2 border-gray-300 rounded-lg file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-lg file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {formData.photo && (
            <p className="mt-2 text-green-600 font-medium">✓ {formData.photo.name}</p>
          )}
        </label>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={prevStep}
          className="flex-1 bg-gray-200 text-gray-800 py-4 px-6 rounded-lg font-semibold text-lg hover:bg-gray-300 transition-colors"
        >
          Back
        </button>
        <button
          onClick={nextStep}
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Review & Dosing Calculator</h2>
        <p className="text-gray-600">Review your readings and calculate chemical dosing</p>
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
            {chlorineValue} ppm {getChlorineStatus(chlorineValue).icon}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-900">pH:</span>
          <span className={`font-bold ${getPhStatus(phValue).color}`}>
            {phValue} {getPhStatus(phValue).icon}
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
        <h3 className="text-lg font-semibold text-blue-900">Chlorine Dosing Calculator</h3>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-blue-800">Pool Volume (gallons)</span>
            <input
              type="number"
              value={formData.poolVolume}
              onChange={(e) => handleInputChange('poolVolume', e.target.value)}
              className="mt-1 w-full p-2 border border-blue-300 rounded focus:border-blue-500 focus:ring-0"
              placeholder="20000"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-blue-800">Target Chlorine (ppm)</span>
            <input
              type="number"
              step="0.1"
              value={formData.targetChlorine}
              onChange={(e) => handleInputChange('targetChlorine', e.target.value)}
              className="mt-1 w-full p-2 border border-blue-300 rounded focus:border-blue-500 focus:ring-0"
              placeholder="3.0"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-blue-800">Chlorine Strength (%)</span>
            <input
              type="number"
              step="0.1"
              value={formData.chlorineStrength}
              onChange={(e) => handleInputChange('chlorineStrength', e.target.value)}
              className="mt-1 w-full p-2 border border-blue-300 rounded focus:border-blue-500 focus:ring-0"
              placeholder="10"
            />
          </label>
          <label className="flex items-center space-x-2 mt-6">
            <input
              type="checkbox"
              checked={formData.isBabyPool}
              onChange={(e) => handleInputChange('isBabyPool', e.target.checked)}
              className="w-5 h-5 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-blue-800">Baby Pool</span>
          </label>
        </div>

        {formData.poolVolume && (
          <div className="bg-white rounded-lg p-4 border border-blue-300">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-blue-900">Recommended Dose:</span>
              <span className="text-2xl font-bold text-blue-600">
                {dosingResult.dose === 0 ? 'No chlorine needed' :
                 `${dosingResult.dose.toFixed(1)} ${dosingResult.dose >= 1 ? 'pounds' : 'ounces'}`}
              </span>
            </div>

            {dosingResult.warnings.length > 0 && (
              <div className="space-y-1">
                {dosingResult.warnings.map((warning, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-orange-500 text-sm mt-0.5">⚠️</span>
                    <p className="text-orange-700 text-sm">{warning}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex space-x-4">
        <button
          onClick={prevStep}
          className="flex-1 bg-gray-200 text-gray-800 py-4 px-6 rounded-lg font-semibold text-lg hover:bg-gray-300 transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => setCurrentStep('submit')}
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
          <div className="text-6xl mb-4">📋</div>
          <p className="text-lg text-gray-700">
            Ready to submit chemical log for <strong>{selectedPool?.name}</strong>?
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-green-600 text-white py-6 px-6 rounded-lg font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-colors flex items-center justify-center space-x-3"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <span>✅</span>
              <span>Submit Chemical Log</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={prevStep}
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
            <span className="text-green-600 text-xl">✅</span>
            <p className="text-green-700 font-medium">{submitMessage}</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-md mx-auto px-4 py-6">
        {renderStepIndicator()}

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          {currentStep === 'pool' && renderPoolStep()}
          {currentStep === 'chlorine' && renderChlorineStep()}
          {currentStep === 'ph' && renderPhStep()}
          {currentStep === 'notes' && renderNotesStep()}
          {currentStep === 'review' && renderReviewStep()}
          {currentStep === 'submit' && renderSubmitStep()}
        </div>
      </div>
    </div>
  );
}

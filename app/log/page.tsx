'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

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
}

const fallbackPools: Pool[] = [
  { id: '1', name: 'Main Pool' },
  { id: '2', name: 'Kids Pool' },
  { id: '3', name: 'Olympic Pool' },
  { id: '4', name: 'Therapy Pool' },
  { id: '5', name: 'Diving Pool' },
  { id: '6', name: 'Lap Pool' }
];

const getChlorineRecommendation = (chlorine: number): string => {
  if (chlorine < 1.0) return 'Add chlorine shock treatment immediately';
  if (chlorine < 2.0) return 'Add 1-2 lbs of chlorine per 10,000 gallons';
  if (chlorine > 5.0) return 'Chlorine levels too high - allow to dissipate naturally';
  return 'Chlorine levels are good';
};

const getPhRecommendation = (ph: number): string => {
  if (ph < 7.2) return 'Add pH increaser (soda ash) - 1 lb per 10,000 gallons';
  if (ph > 7.8) return 'Add pH decreaser (muriatic acid) - follow product instructions';
  return 'pH levels are good';
};

const isChlorineOutOfRange = (chlorine: number): boolean => {
  return chlorine < 1.0 || chlorine > 5.0;
};

const isPhOutOfRange = (ph: number): boolean => {
  return ph < 7.2 || ph > 7.8;
};

export default function LogPage() {
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

  useEffect(() => {
    const loadPools = async () => {
      setLoadingPools(true);

      try {
        const { data, error } = await supabase.from('pools').select('id,name').order('name');

        if (error) {
          const message = typeof error.message === 'string' ? error.message : String(error);
          setPoolLoadError(`Unable to load pools from Supabase: ${message}`);
          setPools(fallbackPools);
        } else {
          setPools(data && data.length > 0 ? data : fallbackPools);
        }
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : String(loadError);
        setPoolLoadError(`Unable to load pools from Supabase: ${message}`);
        setPools(fallbackPools);
      }

      setLoadingPools(false);
    };

    loadPools();
  }, []);

  const handleInputChange = (field: keyof FormData, value: string | File | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleInputChange('photo', file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);

    const chlorineValue = parseFloat(formData.freeChlorine);
    const phValue = parseFloat(formData.ph);

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
        photo: null
      });
      setPhotoKey((prev) => prev + 1);
      setTimeout(() => setSubmitMessage(''), 3000);
    }

    setIsSubmitting(false);
  };

  const chlorine = parseFloat(formData.freeChlorine);
  const ph = parseFloat(formData.ph);
  const hasValidReadings = !isNaN(chlorine) && !isNaN(ph);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Chemical Log</h1>
          <p className="text-gray-600 text-sm">Record pool chemistry readings</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="pool" className="block text-sm font-medium text-gray-700 mb-2">
              Select Pool
            </label>
            <select
              id="pool"
              value={formData.poolId}
              onChange={(e) => handleInputChange('poolId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={loadingPools}
            >
              <option value="">{loadingPools ? 'Loading pools...' : 'Choose a pool...'}</option>
              {pools.map((pool) => (
                <option key={pool.id} value={pool.id}>
                  {pool.name}
                </option>
              ))}
            </select>
            {poolLoadError && <p className="mt-2 text-sm text-red-600">{poolLoadError}</p>}
          </div>

          <div>
            <label htmlFor="chlorine" className="block text-sm font-medium text-gray-700 mb-2">
              Free Chlorine (ppm)
            </label>
            <input
              type="number"
              id="chlorine"
              step="0.1"
              min="0"
              max="10"
              value={formData.freeChlorine}
              onChange={(e) => handleInputChange('freeChlorine', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 2.5"
              required
            />
          </div>

          <div>
            <label htmlFor="ph" className="block text-sm font-medium text-gray-700 mb-2">
              pH Level
            </label>
            <input
              type="number"
              id="ph"
              step="0.1"
              min="0"
              max="14"
              value={formData.ph}
              onChange={(e) => handleInputChange('ph', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 7.4"
              required
            />
          </div>

          <div>
            <label htmlFor="photo" className="block text-sm font-medium text-gray-700 mb-2">
              Pool Photo (Optional)
            </label>
            <input
              key={photoKey}
              type="file"
              id="photo"
              accept="image/*"
              onChange={handlePhotoChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {formData.photo && (
              <p className="mt-2 text-sm text-gray-600">Selected: {formData.photo.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              rows={3}
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any observations or actions taken..."
            />
          </div>

          {hasValidReadings && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Dosing Recommendations</h3>
              <div className="space-y-2 text-sm text-blue-800">
                <div className={isChlorineOutOfRange(chlorine) ? 'text-red-700 font-medium' : ''}>
                  <strong>Chlorine:</strong> {getChlorineRecommendation(chlorine)}
                </div>
                <div className={isPhOutOfRange(ph) ? 'text-red-700 font-medium' : ''}>
                  <strong>pH:</strong> {getPhRecommendation(ph)}
                </div>
              </div>
            </div>
          )}

          {(isChlorineOutOfRange(chlorine) || isPhOutOfRange(ph)) && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Chemistry Out of Range</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc pl-5 space-y-1">
                      {isChlorineOutOfRange(chlorine) && (
                        <li>Free chlorine is outside safe range (1.0 - 5.0 ppm)</li>
                      )}
                      {isPhOutOfRange(ph) && (
                        <li>pH is outside safe range (7.2 - 7.8)</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </div>
            ) : (
              'Submit Chemical Log'
            )}
          </button>

          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}
          {submitMessage && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{submitMessage}</p>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Home, Apple, TrendingUp, Loader } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [workouts, setWorkouts] = useState(() => {
    const saved = localStorage.getItem('workouts');
    return saved ? JSON.parse(saved) : {};
  });
  const [nutrition, setNutrition] = useState(() => {
    const saved = localStorage.getItem('nutrition');
    return saved ? JSON.parse(saved) : { calories: 0, protein: 0, meals: [] };
  });
  const [weight, setWeight] = useState(() => {
    const saved = localStorage.getItem('weight');
    return saved ? JSON.parse(saved) : [];
  });
  const [weightInput, setWeightInput] = useState('');
  const [showFoodScanner, setShowFoodScanner] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const fileInputRef = useRef(null);

  const today = new Date();
  const dayOfWeek = today.getDay();
  const dateKey = today.toISOString().split('T')[0];

  const getWorkoutPlan = () => {
    if (dayOfWeek === 0) {
      return {
        name: 'REST DAY',
        type: 'rest',
        exercises: [],
        quote: 'The mind adapts to what we practice. Rest is productive.'
      };
    }
    if (dayOfWeek === 1 || dayOfWeek === 4) {
      return {
        name: 'PULL',
        type: 'pull',
        goal: 'V-Shape Width & Thickness',
        exercises: [
          { name: 'Assisted Pull-up', sets: 4, reps: '6-8' },
          { name: 'Close Grip Lat Pull-down', sets: 3, reps: '8-10' },
          { name: 'Chest Support Wide Row', sets: 3, reps: '8-10' },
          { name: 'Neutral Grip Vertical Row', sets: 3, reps: '10-12' },
          { name: 'Rear Delt Fly', sets: 3, reps: '12-15' },
          { name: 'Preacher Machine Curl', sets: 3, reps: '8-10' },
          { name: 'Incline Curl', sets: 3, reps: '10-12' },
          { name: 'Cross Body Hammer Curl', sets: 2, reps: '10-12' }
        ]
      };
    }
    if (dayOfWeek === 2 || dayOfWeek === 5) {
      if (dayOfWeek === 2) {
        return {
          name: 'PUSH',
          type: 'push',
          goal: 'Upper Chest & Shoulders',
          exercises: [
            { name: 'Incline DB Press', sets: 4, reps: '6-8' },
            { name: 'Chest Fly', sets: 3, reps: '8-10' },
            { name: 'Assisted Dips', sets: 3, reps: '8-10' },
            { name: 'Military Press', sets: 3, reps: '6-8' },
            { name: 'Lateral Raises', sets: 3, reps: '12-15' },
            { name: 'Triceps Pushdown', sets: 3, reps: '10-12' },
            { name: 'Overhead Triceps Extension', sets: 2, reps: '10-12' }
          ]
        };
      } else {
        return {
          name: 'LEGS & CARDIO',
          type: 'legs',
          goal: 'Burn Fat, Preserve Muscle',
          exercises: [
            { name: 'Incline Walk', sets: 1, reps: '12% • 4.5 speed' },
            { name: 'Leg Press', sets: 4, reps: '20 (light)' },
            { name: 'Leg Extension', sets: 3, reps: '12-15' },
            { name: 'Plank / Face Pulls', sets: 3, reps: '30-45s' }
          ]
        };
      }
    }
    if (dayOfWeek === 3) {
      return {
        name: 'PUSH',
        type: 'push',
        goal: 'Upper Chest & Shoulders',
        exercises: [
          { name: 'Incline DB Press', sets: 4, reps: '6-8' },
          { name: 'Chest Fly', sets: 3, reps: '8-10' },
          { name: 'Assisted Dips', sets: 3, reps: '8-10' },
          { name: 'Military Press', sets: 3, reps: '6-8' },
          { name: 'Lateral Raises', sets: 3, reps: '12-15' },
          { name: 'Triceps Pushdown', sets: 3, reps: '10-12' },
          { name: 'Overhead Triceps Extension', sets: 2, reps: '10-12' }
        ]
      };
    }
  };

  const workout = getWorkoutPlan();
  const isWorkoutComplete = workouts[dateKey];

  const handleWorkoutComplete = () => {
    const updated = { ...workouts, [dateKey]: true };
    setWorkouts(updated);
    localStorage.setItem('workouts', JSON.stringify(updated));
  };

  const handleAddMeal = (meal) => {
    const updated = {
      ...nutrition,
      calories: nutrition.calories + meal.calories,
      protein: nutrition.protein + meal.protein,
      meals: [...nutrition.meals, meal]
    };
    setNutrition(updated);
    localStorage.setItem('nutrition', JSON.stringify(updated));
    setShowFoodScanner(false);
  };

  const handleAddWeight = () => {
    if (!weightInput) return;
    const entry = { date: dateKey, weight: parseFloat(weightInput) };
    const updated = [...weight, entry];
    setWeight(updated);
    localStorage.setItem('weight', JSON.stringify(updated));
    setWeightInput('');
  };

  const handleResetNutrition = () => {
    setNutrition({ calories: 0, protein: 0, meals: [] });
    localStorage.setItem('nutrition', JSON.stringify({ calories: 0, protein: 0, meals: [] }));
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAiLoading(true);
    setAiError('');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Image = e.target?.result?.split(',')[1];
        if (!base64Image) {
          setAiError('Failed to read image');
          setAiLoading(false);
          return;
        }

        try {
          const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

          const response = await model.generateContent([
            {
              inlineData: {
                mimeType: file.type,
                data: base64Image,
              },
            },
            'Analyze this meal photo and provide nutritional information. Extract: 1) Meal name, 2) Estimated calories, 3) Estimated protein in grams. Respond in JSON format only like this: {"name": "meal name", "calories": number, "protein": number}. Be realistic with portions shown.',
          ]);

          const text = response.response.text();
          const jsonMatch = text.match(/\{[\s\S]*\}/);
    
          if (!jsonMatch) {
            setAiError('Could not parse meal data');
            setAiLoading(false);
            return;
          }

          const mealData = JSON.parse(jsonMatch[0]);
          
          if (mealData.name && mealData.calories && mealData.protein) {
            handleAddMeal({
              name: mealData.name,
              calories: Math.round(mealData.calories),
              protein: Math.round(mealData.protein)
            });
          } else {
            setAiError('Invalid meal data received');
          }
        } catch (apiError) {
          console.error('Gemini API error:', apiError);
          setAiError('Failed to analyze meal. Check your API key or try again.');
        }
        setAiLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setAiError('Error processing image');
      setAiLoading(false);
    }
  };

  const caloriePercent = Math.min((nutrition.calories / 2200) * 100, 100);
  const proteinPercent = Math.min((nutrition.protein / 180) * 100, 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Premium Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-100 to-purple-100 rounded-full blur-3xl opacity-40"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-100 to-cyan-100 rounded-full blur-3xl opacity-30"></div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extralight tracking-wider text-gray-900 mb-1">GYUUM</h1>
          <div className="h-0.5 w-12 bg-gradient-to-r from-indigo-400 to-purple-400 mx-auto mb-3"></div>
          <p className="text-xs tracking-widest text-gray-500 font-medium">PROTOCOL TOJI</p>
        </div>

        {/* Tab Content */}
        <div className="transition-all duration-500">
          {/* HOME TAB */}
          {activeTab === 'home' && (
            <div className="space-y-5">
              {/* Workout Card */}
              <div className="group">
                <div className="bg-white/70 backdrop-blur-2xl border border-white/80 rounded-3xl p-7 shadow-2xl hover:shadow-3xl hover:bg-white/80 transition-all duration-300">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold">Today</p>
                      <h2 className="text-3xl font-light text-gray-900 mt-3">{workout.name}</h2>
                      {workout.goal && <p className="text-xs text-gray-500 mt-2">{workout.goal}</p>}
                    </div>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isWorkoutComplete ? 'bg-emerald-100 border-2 border-emerald-400 shadow-lg shadow-emerald-200' : 'bg-gray-100 border-2 border-gray-200'}`}>
                      <div className={`w-7 h-7 rounded-full transition-all ${isWorkoutComplete ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-lg' : 'bg-gray-300'}`}></div>
                    </div>
                  </div>

                  {workout.type === 'rest' ? (
                    <div className="py-6">
                      <p className="text-sm text-gray-600 leading-relaxed italic text-center">{workout.quote}</p>
                    </div>
                  ) : (
                    <div className="space-y-0 divide-y divide-gray-100">
                      {workout.exercises.map((ex, i) => (
                        <div key={i} className="py-3 first:pt-0 last:pb-0">
                          <p className="text-sm font-medium text-gray-800">{ex.name}</p>
                          <p className="text-xs text-gray-400 mt-1.5">{ex.sets} sets × {ex.reps}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {workout.type !== 'rest' && (
                    <>
                      {!isWorkoutComplete && (
                        <button onClick={handleWorkoutComplete} className="w-full mt-7 py-3.5 bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-950 hover:to-gray-900 text-white rounded-xl font-medium text-sm tracking-wide transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl active:scale-95">
                          Mark Complete
                        </button>
                      )}
                      {isWorkoutComplete && (
                        <div className="w-full mt-7 py-3.5 bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl font-medium text-sm text-center tracking-wide">
                          ✓ Completed
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="bg-white/70 backdrop-blur-2xl border border-white/80 rounded-3xl p-6 shadow-2xl">
                <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-4">28-Day Streak</p>
                <div className="grid grid-cols-7 gap-2.5">
                  {Array.from({ length: 28 }).map((_, i) => {
                    const checkDate = new Date(today);
                    checkDate.setDate(checkDate.getDate() - 27 + i);
                    const key = checkDate.toISOString().split('T')[0];
                    const isCompleted = workouts[key];
                    return (
                      <div key={i} className={`aspect-square flex items-center justify-center rounded-lg font-light text-xs transition-all duration-200 transform hover:scale-110 ${isCompleted ? 'bg-emerald-400 text-white font-medium shadow-lg shadow-emerald-200 border border-emerald-500' : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-150'}`}>
                        {checkDate.getDate()}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* NUTRITION TAB */}
          {activeTab === 'nutrition' && (
            <div className="space-y-5">
              {/* Progress Rings */}
              <div className="bg-white/70 backdrop-blur-2xl border border-white/80 rounded-3xl p-8 shadow-2xl">
                <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-6 text-center">Daily Nutrition</p>
                <div className="relative w-40 h-40 mx-auto mb-6">
                  <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-lg">
                    {/* Calories Outer Ring */}
                    <circle cx="100" cy="100" r="75" fill="none" stroke="#e5e7eb" strokeWidth="14" />
                    <circle
                      cx="100"
                      cy="100"
                      r="75"
                      fill="none"
                      stroke="url(#calorieGradient)"
                      strokeWidth="14"
                      strokeDasharray={`${(caloriePercent / 100) * 471} 471`}
                      strokeLinecap="round"
                      className="transition-all duration-500 origin-center"
                      style={{ transform: 'rotate(-90deg)' }}
                      transform="rotate(-90 100 100)"
                    />
                    {/* Protein Inner Ring */}
                    <circle cx="100" cy="100" r="50" fill="none" stroke="#f3f4f6" strokeWidth="12" />
                    <circle
                      cx="100"
                      cy="100"
                      r="50"
                      fill="none"
                      stroke="url(#proteinGradient)"
                      strokeWidth="12"
                      strokeDasharray={`${(proteinPercent / 100) * 314} 314`}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                      style={{ transform: 'rotate(-90deg)' }}
                      transform="rotate(-90 100 100)"
                    />
                    <defs>
                      <linearGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                      <linearGradient id="proteinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ec4899" />
                        <stop offset="100%" stopColor="#f97316" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-2xl font-light text-gray-900">{Math.round(nutrition.calories)}</p>
                    <p className="text-xs text-gray-400">kcal</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-100">
                    <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wide mb-2">Calories</p>
                    <p className="text-lg font-light text-indigo-900">{Math.round(nutrition.calories)}<span className="text-xs text-indigo-500"> / 2200</span></p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-pink-50 rounded-2xl p-4 border border-orange-100">
                    <p className="text-xs text-orange-600 font-semibold uppercase tracking-wide mb-2">Protein</p>
                    <p className="text-lg font-light text-orange-900">{Math.round(nutrition.protein)}<span className="text-xs text-orange-500"> / 180g</span></p>
                  </div>
                </div>
              </div>

              {/* Scan Button */}
              <button onClick={() => setShowFoodScanner(!showFoodScanner)} className="w-full py-4 bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-950 hover:to-gray-900 text-white rounded-2xl font-medium text-sm tracking-wide shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-95 disabled:opacity-50" disabled={aiLoading}>
                {aiLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader size={16} className="animate-spin" />
                    Analyzing...
                  </div>
                ) : (
                  '+ Scan Meal with AI'
                )}
              </button>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />

              {/* Food Scanner Modal */}
              {showFoodScanner && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end p-4 justify-center">
                  <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-96 overflow-y-auto">
                    <div className="mb-4">
                      <h3 className="text-lg font-light text-gray-900">Add Meal</h3>
                    </div>

                    {/* AI Image Upload */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={aiLoading}
                      className="w-full mb-4 p-4 border-2 border-dashed border-indigo-300 rounded-2xl bg-indigo-50 hover:bg-indigo-100 transition text-indigo-700 font-medium text-sm disabled:opacity-50"
                    >
                      {aiLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader size={16} className="animate-spin" />
                          Analyzing meal...
                        </div>
                      ) : (
                        '📸 Upload Meal Photo for AI Analysis'
                      )}
                    </button>

                    {aiError && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                        {aiError}
                      </div>
                    )}

                    <div className="mb-4">
                      <p className="text-xs text-gray-500 font-medium mb-3">Or choose preset:</p>
                    </div>

                    <div className="space-y-3 mb-4">
                      {[
                        { name: 'Grilled Chicken & Rice', calories: 650, protein: 45 },
                        { name: 'Salmon & Vegetables', calories: 580, protein: 50 },
                        { name: 'Greek Yogurt & Berries', calories: 320, protein: 28 },
                        { name: 'Protein Shake', calories: 220, protein: 35 },
                        { name: 'Pasta & Marinara', calories: 480, protein: 18 }
                      ].map((meal, i) => (
                        <button key={i} onClick={() => handleAddMeal(meal)} className="w-full text-left p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 hover:from-gray-100 hover:to-gray-150 transition-all duration-200 active:scale-95">
                          <p className="font-medium text-sm text-gray-900">{meal.name}</p>
                          <p className="text-xs text-gray-500 mt-1.5">{meal.calories} kcal • {meal.protein}g protein</p>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setShowFoodScanner(false)} className="w-full py-2 text-gray-600 font-medium text-sm hover:text-gray-900 transition">
                      Close
                    </button>
                  </div>
                </div>
              )}

              {/* Meals List */}
              {nutrition.meals.length > 0 && (
                <div className="bg-white/70 backdrop-blur-2xl border border-white/80 rounded-3xl p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold">Today's Meals</p>
                    <button onClick={handleResetNutrition} className="text-xs text-gray-400 hover:text-gray-600 font-medium transition">
                      Reset
                    </button>
                  </div>
                  <div className="space-y-2 divide-y divide-gray-100">
                    {nutrition.meals.map((meal, i) => (
                      <div key={i} className="flex justify-between py-3 first:pt-0">
                        <p className="text-sm text-gray-700">{meal.name}</p>
                        <p className="text-xs font-medium text-gray-500">{meal.calories} cal</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PROGRESS TAB */}
          {activeTab === 'progress' && (
            <div className="space-y-5">
              {/* Weight Input */}
              <div className="bg-white/70 backdrop-blur-2xl border border-white/80 rounded-3xl p-6 shadow-2xl">
                <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-4">Weight Tracking</p>
                <div className="flex gap-3">
                  <input type="number" step="0.1" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} placeholder="Enter weight" className="flex-1 px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition" />
                  <button onClick={handleAddWeight} className="px-5 py-3.5 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white rounded-lg font-medium text-sm transition-all duration-300 transform hover:scale-105 active:scale-95">
                    +
                  </button>
                </div>
              </div>

              {/* Weight Chart */}
              {weight.length > 0 && (
                <div className="bg-white/70 backdrop-blur-2xl border border-white/80 rounded-3xl p-6 shadow-2xl">
                  <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-5">30-Day Trend</p>
                  <div className="relative h-48">
                    <svg viewBox="0 0 300 150" className="w-full" preserveAspectRatio="none">
                      {/* Grid Lines */}
                      {[0, 1, 2, 3, 4].map((i) => (
                        <line key={`grid-${i}`} x1="0" y1={i * 37.5} x2="300" y2={i * 37.5} stroke="#e5e7eb" strokeWidth="1" opacity="0.5" />
                      ))}

                      {weight.length >= 2 && (
                        <>
                          <defs>
                            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="rgba(99, 102, 241, 0.3)" />
                              <stop offset="100%" stopColor="rgba(99, 102, 241, 0.01)" />
                            </linearGradient>
                          </defs>

                          {/* Area Fill */}
                          <path
                            d={`M ${weight.map((w, i) => {
                              const minW = Math.min(...weight.map((x) => x.weight));
                              const maxW = Math.max(...weight.map((x) => x.weight));
                              const range = maxW - minW || 1;
                              const x = (i / (weight.length - 1 || 1)) * 300;
                              const y = 150 - ((w.weight - minW) / range) * 120 - 15;
                              return `${x},${y}`;
                            }).join('L')} L 300,150 L 0,150 Z`}
                            fill="url(#areaGradient)"
                          />

                          {/* Line */}
                          <path
                            d={`M ${weight.map((w, i) => {
                              const minW = Math.min(...weight.map((x) => x.weight));
                              const maxW = Math.max(...weight.map((x) => x.weight));
                              const range = maxW - minW || 1;
                              const x = (i / (weight.length - 1 || 1)) * 300;
                              const y = 150 - ((w.weight - minW) / range) * 120 - 15;
                              return `${x},${y}`;
                            }).join('L')}`}
                            fill="none"
                            stroke="#6366f1"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Points */}
                          {weight.map((w, i) => {
                            const minW = Math.min(...weight.map((x) => x.weight));
                            const maxW = Math.max(...weight.map((x) => x.weight));
                            const range = maxW - minW || 1;
                            const x = (i / (weight.length - 1 || 1)) * 300;
                            const y = 150 - ((w.weight - minW) / range) * 120 - 15;
                            return <circle key={`dot-${i}`} cx={x} cy={y} r="4.5" fill="#6366f1" />;
                          })}
                        </>
                      )}
                    </svg>
                  </div>
                  <div className="mt-4 flex justify-between text-xs text-gray-400 font-medium">
                    <span>30d ago</span>
                    <span>Today</span>
                  </div>
                </div>
              )}

              {/* Weight History */}
              {weight.length > 0 && (
                <div className="bg-white/70 backdrop-blur-2xl border border-white/80 rounded-3xl p-6 shadow-2xl">
                  <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-4">History</p>
                  <div className="space-y-2 divide-y divide-gray-100 max-h-64 overflow-y-auto">
                    {[...weight].reverse().map((w, i) => (
                      <div key={i} className="flex justify-between py-3 first:pt-0">
                        <p className="text-sm text-gray-600">{new Date(w.date).toLocaleDateString()}</p>
                        <p className="text-sm font-medium text-gray-900">{w.weight} kg</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Spacer for Nav */}
        <div className="h-24"></div>
      </div>

      {/* Bottom Navigation - Floating */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-center p-4">
        <div className="w-full max-w-md bg-white/70 backdrop-blur-2xl border border-white/80 rounded-2xl shadow-2xl flex justify-around items-center p-3">
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-300 ${activeTab === 'home' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
            <Home size={22} strokeWidth={1.5} />
            <span className="text-xs font-medium">Home</span>
          </button>
          <button onClick={() => setActiveTab('nutrition')} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-300 ${activeTab === 'nutrition' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
            <Apple size={22} strokeWidth={1.5} />
            <span className="text-xs font-medium">Nutrition</span>
          </button>
          <button onClick={() => setActiveTab('progress')} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-300 ${activeTab === 'progress' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
            <TrendingUp size={22} strokeWidth={1.5} />
            <span className="text-xs font-medium">Progress</span>
          </button>
        </div>
      </div>
    </div>
  );
}

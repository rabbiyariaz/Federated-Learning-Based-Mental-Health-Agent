import { useState } from 'react';

/**
 * MoodQuestions component - Optional mood assessment questions
 * @param {Function} onMoodChange - Callback function that receives mood data object
 */
function MoodQuestions({ onMoodChange }) {
  const [sleep, setSleep] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [appetite, setAppetite] = useState('normal');

  // Update parent whenever any value changes
  const handleChange = (field, value) => {
    let newMoodData;
    
    if (field === 'sleep') {
      setSleep(value);
      newMoodData = { sleep: parseInt(value), energy, appetite };
    } else if (field === 'energy') {
      setEnergy(value);
      newMoodData = { sleep, energy: parseInt(value), appetite };
    } else if (field === 'appetite') {
      setAppetite(value);
      newMoodData = { sleep, energy, appetite: value };
    }
    
    if (onMoodChange) {
      onMoodChange(newMoodData);
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <h3 className="text-lg font-semibold text-teal-300 mb-4">
        Optional Mood Questions
      </h3>
      <p className="text-sm text-slate-400 mb-6">
        These questions can help provide additional context for the analysis.
      </p>

      <div className="space-y-6">
        {/* Sleep Quality */}
        <div>
          <label className="block text-slate-300 font-medium mb-2">
            Sleep Quality (1 = Very Poor, 5 = Excellent)
          </label>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-400 w-12">1</span>
            <input
              type="range"
              min="1"
              max="5"
              value={sleep}
              onChange={(e) => handleChange('sleep', e.target.value)}
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
            <span className="text-sm text-slate-400 w-12">5</span>
            <span className="text-teal-400 font-semibold w-8 text-center">{sleep}</span>
          </div>
        </div>

        {/* Energy Level */}
        <div>
          <label className="block text-slate-300 font-medium mb-2">
            Energy Level (1 = Very Low, 5 = Very High)
          </label>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-400 w-12">1</span>
            <input
              type="range"
              min="1"
              max="5"
              value={energy}
              onChange={(e) => handleChange('energy', e.target.value)}
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
            <span className="text-sm text-slate-400 w-12">5</span>
            <span className="text-teal-400 font-semibold w-8 text-center">{energy}</span>
          </div>
        </div>

        {/* Appetite Changes */}
        <div>
          <label className="block text-slate-300 font-medium mb-3">
            Appetite Changes
          </label>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="appetite"
                value="increase"
                checked={appetite === 'increase'}
                onChange={(e) => handleChange('appetite', e.target.value)}
                className="mr-2 accent-teal-600"
              />
              <span className="text-slate-300">Increase</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="appetite"
                value="normal"
                checked={appetite === 'normal'}
                onChange={(e) => handleChange('appetite', e.target.value)}
                className="mr-2 accent-teal-600"
              />
              <span className="text-slate-300">Normal</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="appetite"
                value="decrease"
                checked={appetite === 'decrease'}
                onChange={(e) => handleChange('appetite', e.target.value)}
                className="mr-2 accent-teal-600"
              />
              <span className="text-slate-300">Decrease</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MoodQuestions;


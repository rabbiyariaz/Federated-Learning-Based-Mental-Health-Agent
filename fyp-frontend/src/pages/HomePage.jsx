import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 home-hero">
      {/* Hero Section */}
      <div className="mb-12 hero-fade-in">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          {/* Left: text */}
          <div className="text-center md:text-left">
            <div className="flex justify-center md:justify-start items-center gap-4 mb-6">
              <h1 className="text-4xl font-bold text-teal-400">
                ConfidMind
              </h1>
            </div>
            <p className="text-xl text-slate-300 mb-2">
              Federated Learning Based Mental Health AI Agent
            </p>
            <p className="text-lg text-slate-400">
              A privacy-preserving mental health assistant powered by federated learning
            </p>

            {/* Action Buttons (kept in hero) */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link
                to="/screening"
                className="home-cta-btn bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors text-center"
              >
                Start Screening
              </Link>
              <Link
                to="/chat"
                className="home-cta-btn bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors text-center"
              >
                Chat with Agent
              </Link>
            </div>
          </div>

          {/* Right: hero image */}
          <div className="flex justify-center md:justify-end md:pl-8 pt-2 md:pt-0">
            <img
              src="/image.png"
              alt="ConfidMind hero"
              className="w-full max-w-md rounded-2xl shadow-lg border border-slate-700/50"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-slate-800 rounded-lg p-8 mb-8 border border-slate-700 hero-fade-in">
        <h2 className="text-2xl font-semibold text-teal-300 mb-4">What This Project Does</h2>
        <div className="space-y-4 text-slate-300">
          <p>
            This system is a mental health assistant that analyzes your text (journal entries or chat messages) 
            to provide supportive feedback. It uses advanced AI technology to:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>
              <strong className="text-teal-400">Detect emotions</strong> in your text using a fine-tuned DistilBERT model 
              trained on the GoEmotions dataset
            </li>
            <li>
              <strong className="text-teal-400">Estimate depression risk indicators</strong> using a model trained on 
              the DAIC-WOZ dataset
            </li>
            <li>
              <strong className="text-teal-400">Learn from distributed data</strong> through federated learning, 
              ensuring your personal data stays private and is never centralized
            </li>
            <li>
              <strong className="text-teal-400">Provide supportive responses</strong> using a knowledge base of 
              psychoeducational content
            </li>
          </ul>
        </div>
      </div>

      {/* Safety Disclaimer */}
      <div className="bg-amber-900/30 border-2 border-amber-600 rounded-lg p-6 mb-8 hero-fade-in">
        <div className="flex items-start">
          <span className="text-2xl mr-3">⚠️</span>
          <div>
            <h3 className="text-xl font-semibold text-amber-400 mb-2">Important Safety Disclaimer</h3>
            <p className="text-amber-100">
              This tool is not a diagnostic tool and cannot confirm whether you have depression or any other mental health condition. 
              It is only designed to provide general indicators that may suggest you could benefit from speaking with a qualified 
              mental health professional. This tool does not replace professional diagnosis, treatment, or medical advice. If you are 
              experiencing distress or believe you may be struggling with a mental health condition, please consult a licensed mental 
              health professional. If you are in crisis, contact local emergency services or a crisis helpline immediately.
            </p>
          </div>
        </div>
      </div>

      {/* (Buttons moved into the Hero Section above) */}
    </div>
  );
}

export default HomePage;


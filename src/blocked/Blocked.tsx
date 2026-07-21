import { useEffect, useState } from 'react';
import { 
  Compass, ArrowLeft, BookOpen, Brain, CheckCircle
} from 'lucide-react';
import { getSettings, addBypass, ExtensionSettings } from '../utils/storage';
import { getRandomVerseFromCategory, SearchVerse } from '../utils/bible';
import { initTheme } from '../utils/theme';

export default function Blocked() {
  const [domain, setDomain] = useState('distracting site');
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [randomVerse, setRandomVerse] = useState<SearchVerse | null>(null);
  
  // Pause & reflect state
  const [countdown, setCountdown] = useState(10);
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [breathText, setBreathText] = useState('Breathe in...');
  const [hasReflected, setHasReflected] = useState(false);

  useEffect(() => {
    initTheme();
    loadContext();
  }, []);

  const loadContext = async () => {
    // 1. Get query param url
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('url');
    if (urlParam) {
      setDomain(urlParam);
    }

    // 2. Load settings
    const currentSettings = await getSettings();
    setSettings(currentSettings);

    // 3. Choose a random comforting scripture (Peace or Anxiety category)
    const category = Math.random() > 0.5 ? 'Peace' : 'Anxiety';
    setRandomVerse(getRandomVerseFromCategory(category));
  };

  // Countdown & Breathing Cycle timer
  useEffect(() => {
    if (countdown <= 0) {
      setHasReflected(true);
      setBreathText('Pause complete.');
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
      
      // Update breathing phase text based on seconds
      // 10s countdown:
      // Sec 10, 9, 8: Breathe In (3s)
      // Sec 7, 6: Hold (2s)
      // Sec 5, 4, 3: Breathe Out (3s)
      // Sec 2, 1: Rest/Hold (2s)
      const sec = countdown;
      if (sec >= 8) {
        setBreathPhase('in');
        setBreathText('Breathe in...');
      } else if (sec >= 6) {
        setBreathPhase('hold');
        setBreathText('Hold...');
      } else if (sec >= 3) {
        setBreathPhase('out');
        setBreathText('Breathe out...');
      } else {
        setBreathPhase('hold');
        setBreathText('Rest...');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  // Actions
  const handleReturnToFocus = () => {
    // Redirect back to newtab safety
    window.location.href = 'newtab.html';
  };

  const handleContinueAnyway = async () => {
    if (!settings) return;
    
    // Add bypass for the domain
    await addBypass(domain, settings.bypassDuration);
    
    // Redirect back to original URL
    window.location.replace('https://' + domain);
  };

  if (!randomVerse) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-primary">
        <div className="animate-spin-slow rounded-full h-8 w-8 border-b-2 border-primary-moss"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between p-6 md:p-12 relative overflow-hidden bg-bg-primary">
      {/* Background Calm Gradients */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 dark:opacity-10 z-0">
        <div className="absolute rounded-full bg-primary-moss" style={{ top: '-10%', left: '-10%', width: '55%', height: '55%', filter: 'blur(130px)' }}></div>
        <div className="absolute rounded-full bg-accent-gold" style={{ bottom: '-10%', right: '-10%', width: '55%', height: '55%', filter: 'blur(130px)' }}></div>
      </div>

      {/* Top Banner */}
      <header className="flex justify-between items-center w-full max-w-2xl mx-auto z-10">
        <div className="flex items-center gap-2 text-text-secondary">
          <Brain className="h-4.5 w-4.5 text-accent-gold" />
          <span className="font-display font-medium text-xs tracking-wider uppercase">Intentional Space</span>
        </div>
        <span className="bg-bg-secondary px-2.5 py-1 rounded border border-border-color text-text-tertiary" style={{ fontSize: '10px' }}>
          Blocked: {domain}
        </span>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col justify-center items-center w-full max-w-xl mx-auto my-6 z-10">
        
        {/* Breathing Circle Container */}
        <div className="flex flex-col items-center justify-center mb-8 relative">
          <div 
            className={`h-28 w-28 rounded-full border-2 border-primary-moss flex flex-col items-center justify-center transition-all duration-1000 ${
              breathPhase === 'in' ? 'scale-110 bg-primary-moss-light bg-opacity-20' :
              breathPhase === 'out' ? 'scale-95 bg-transparent' :
              'scale-105 bg-accent-gold-light bg-opacity-10 border-accent-gold'
            }`}
          >
            {hasReflected ? (
              <CheckCircle className="h-8 w-8 text-primary-moss" />
            ) : (
              <span className="font-display font-medium text-2xl text-primary">{countdown}s</span>
            )}
          </div>
          <span className="text-xs font-semibold text-text-secondary mt-4" style={{ minHeight: '1rem' }}>
            {breathText}
          </span>
        </div>

        {/* Quiet Reflections Text */}
        <div className="text-center max-w-md mx-auto mb-8 animate-fade-in">
          <blockquote className="font-serif text-lg leading-relaxed text-primary mb-4">
            "{randomVerse.verse}"
          </blockquote>
          <cite className="not-italic font-display text-xs text-accent-gold font-medium">
            — {randomVerse.reference}
          </cite>
        </div>

        {/* Interactive options */}
        <div className="w-full flex flex-col gap-3 animate-fade-in">
          <button 
            onClick={handleReturnToFocus}
            className="btn btn-primary w-full py-3 text-xs"
          >
            <Compass className="h-4 w-4" />
            <span>Return to Focus (Safety)</span>
          </button>
          
          <div className="flex gap-3">
            <button 
              onClick={() => window.location.href = 'newtab.html?tab=search'}
              className="btn btn-secondary flex-1 py-2.5 text-xs"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Read Scripture</span>
            </button>
            
            <button 
              onClick={handleContinueAnyway}
              disabled={!hasReflected}
              className={`btn flex-1 py-2.5 text-xs ${
                hasReflected 
                  ? 'btn-secondary text-text-secondary hover:text-danger hover:border-danger' 
                  : 'btn-secondary text-text-tertiary cursor-not-allowed opacity-50'
              }`}
              title={!hasReflected ? 'Please complete the 10-second reflection first' : ''}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Continue anyway</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="w-full max-w-2xl mx-auto text-center z-10 text-text-tertiary" style={{ fontSize: '10px' }}>
        <p>This pause is designed to help you cultivate healthy browsing habits and connect with scripture.</p>
      </footer>
    </div>
  );
}

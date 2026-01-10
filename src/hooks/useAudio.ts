// Audio system hook for ambient sounds and effects

import { useEffect, useRef, useCallback } from 'react';
import { getCurrentWeather } from '../components/game/renderers/EffectsRenderer';

interface AudioState {
  ambientContext: AudioContext | null;
  gainNode: GainNode | null;
  oscillators: OscillatorNode[];
  noiseNode: AudioBufferSourceNode | null;
  rainNode: AudioBufferSourceNode | null;
  windNode: AudioBufferSourceNode | null;
  birdsNode: AudioBufferSourceNode | null;
  rainGainNode: GainNode | null;
  windGainNode: GainNode | null;
  birdsGainNode: GainNode | null;
  thunderInterval: number | null;
  weatherUpdateInterval: number | null;
}

export function useAudio(isPlaying: boolean, volume: number = 0.3) {
  const audioState = useRef<AudioState>({
    ambientContext: null,
    gainNode: null,
    oscillators: [],
    noiseNode: null,
    rainNode: null,
    windNode: null,
    birdsNode: null,
    rainGainNode: null,
    windGainNode: null,
    birdsGainNode: null,
    thunderInterval: null,
    weatherUpdateInterval: null,
  });

  // Initialize audio context
  const initAudio = useCallback(() => {
    if (audioState.current.ambientContext) return;

    const ctx = new AudioContext();
    const gainNode = ctx.createGain();
    gainNode.gain.value = volume;
    gainNode.connect(ctx.destination);

    audioState.current.ambientContext = ctx;
    audioState.current.gainNode = gainNode;

    // Create minimal ambient drone
    createAmbientDrone(ctx, gainNode);

    // Create atmospheric rain sounds
    createRainAmbience(ctx, gainNode);

    // Create wind/snow ambience
    createWindAmbience(ctx, gainNode);

    // Create birds/nature ambience for sunny weather
    createBirdsAmbience(ctx, gainNode);

    // Start occasional thunder
    startThunderEffects(ctx, gainNode);

    // Start weather-based audio crossfading
    startWeatherAudioUpdates();
  }, [volume]);

  // Create very subtle ambient drone - barely audible atmosphere
  const createAmbientDrone = (ctx: AudioContext, gainNode: GainNode) => {
    // Single very quiet, deep bass - just enough to feel presence
    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bassOsc.type = 'sine';
    bassOsc.frequency.value = 35;
    bassGain.gain.value = 0.04; // Very quiet
    bassOsc.connect(bassGain);
    bassGain.connect(gainNode);
    bassOsc.start();
    audioState.current.oscillators.push(bassOsc);
  };

  // Create gentle wind ambience
  const createWindNoise = (ctx: AudioContext, gainNode: GainNode) => {
    // Create longer buffer for smoother looping
    const bufferSize = ctx.sampleRate * 4;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Generate very smooth pink/brown noise
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink noise algorithm (smoother spectrum)
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = noiseBuffer;
    noiseNode.loop = true;

    // Very gentle lowpass filter for distant wind
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 250;
    lowpass.Q.value = 0.5;

    // Second filter to remove harsh frequencies
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 60;
    highpass.Q.value = 0.3;

    // Very low volume for subtle background
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.025;

    // Very slow, subtle volume modulation for breathing effect
    const volumeLfo = ctx.createOscillator();
    const volumeLfoGain = ctx.createGain();
    volumeLfo.type = 'sine';
    volumeLfo.frequency.value = 0.08; // Very slow
    volumeLfoGain.gain.value = 0.008; // Subtle variation
    volumeLfo.connect(volumeLfoGain);
    volumeLfoGain.connect(noiseGain.gain);
    volumeLfo.start();
    audioState.current.oscillators.push(volumeLfo);

    // Connect the chain
    noiseNode.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(noiseGain);
    noiseGain.connect(gainNode);
    noiseNode.start();
    audioState.current.noiseNode = noiseNode;
  };

  // Create atmospheric rain ambience
  const createRainAmbience = (ctx: AudioContext, gainNode: GainNode) => {
    // Create longer buffer for smooth rain loop
    const bufferSize = ctx.sampleRate * 6;
    const rainBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate); // Stereo for width
    const leftChannel = rainBuffer.getChannelData(0);
    const rightChannel = rainBuffer.getChannelData(1);

    // Generate rain-like noise with varied texture
    for (let i = 0; i < bufferSize; i++) {
      // Base rain noise - filtered white noise
      const baseNoise = Math.random() * 2 - 1;

      // Add occasional louder "drops" for texture
      const dropChance = Math.random();
      const dropIntensity = dropChance > 0.997 ? (Math.random() * 0.5 + 0.5) : 0;

      // Slightly different noise for each channel (stereo width)
      leftChannel[i] = baseNoise * 0.3 + dropIntensity * (Math.random() * 2 - 1);
      rightChannel[i] = (Math.random() * 2 - 1) * 0.3 + dropIntensity * (Math.random() * 2 - 1);
    }

    const rainNode = ctx.createBufferSource();
    rainNode.buffer = rainBuffer;
    rainNode.loop = true;

    // Bandpass filter to shape rain sound (removes harsh highs and rumbling lows)
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 400;
    highpass.Q.value = 0.5;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 8000;
    lowpass.Q.value = 0.3;

    // Add subtle resonance for "pitter-patter" quality
    const resonance = ctx.createBiquadFilter();
    resonance.type = 'peaking';
    resonance.frequency.value = 2500;
    resonance.Q.value = 1;
    resonance.gain.value = 3;

    // Rain volume - prominent but not overwhelming
    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.12;

    // Slow volume modulation for natural variation (rain intensity)
    const intensityLfo = ctx.createOscillator();
    const intensityLfoGain = ctx.createGain();
    intensityLfo.type = 'sine';
    intensityLfo.frequency.value = 0.03; // Very slow variation
    intensityLfoGain.gain.value = 0.03; // Subtle intensity changes
    intensityLfo.connect(intensityLfoGain);
    intensityLfoGain.connect(rainGain.gain);
    intensityLfo.start();
    audioState.current.oscillators.push(intensityLfo);

    // Connect rain audio chain
    rainNode.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(resonance);
    resonance.connect(rainGain);
    rainGain.connect(gainNode);
    rainNode.start();
    audioState.current.rainNode = rainNode;
    audioState.current.rainGainNode = rainGain;

    // Add gentle high-frequency "sizzle" for rain on surfaces
    const sizzleBuffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const sizzleData = sizzleBuffer.getChannelData(0);
    for (let i = 0; i < sizzleData.length; i++) {
      sizzleData[i] = (Math.random() * 2 - 1) * 0.15;
    }

    const sizzleNode = ctx.createBufferSource();
    sizzleNode.buffer = sizzleBuffer;
    sizzleNode.loop = true;

    const sizzleHighpass = ctx.createBiquadFilter();
    sizzleHighpass.type = 'highpass';
    sizzleHighpass.frequency.value = 6000;

    const sizzleGain = ctx.createGain();
    sizzleGain.gain.value = 0.04;

    sizzleNode.connect(sizzleHighpass);
    sizzleHighpass.connect(sizzleGain);
    sizzleGain.connect(gainNode);
    sizzleNode.start();
  };

  // Create wind ambience for snow weather
  const createWindAmbience = (ctx: AudioContext, gainNode: GainNode) => {
    // Create longer buffer for smooth wind loop
    const bufferSize = ctx.sampleRate * 5;
    const windBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    const leftChannel = windBuffer.getChannelData(0);
    const rightChannel = windBuffer.getChannelData(1);

    // Generate wind-like noise with slow modulation baked in
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      const white = Math.random() * 2 - 1;

      // Pink noise algorithm for smoother spectrum
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const pinkNoise = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;

      // Add slow modulation for wind gusts
      const gust1 = Math.sin(t * 0.4) * 0.3 + 0.7;
      const gust2 = Math.sin(t * 0.17 + 1.5) * 0.2 + 0.8;
      const gustEnvelope = gust1 * gust2;

      // Slightly different for each channel (stereo width)
      leftChannel[i] = pinkNoise * gustEnvelope;
      rightChannel[i] = pinkNoise * gustEnvelope * (0.9 + Math.random() * 0.2);
    }

    const windNode = ctx.createBufferSource();
    windNode.buffer = windBuffer;
    windNode.loop = true;

    // Bandpass filter for howling wind character
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 150;
    highpass.Q.value = 0.3;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 1500;
    lowpass.Q.value = 0.5;

    // Add a subtle resonant peak for "whistling" quality
    const resonance = ctx.createBiquadFilter();
    resonance.type = 'peaking';
    resonance.frequency.value = 800;
    resonance.Q.value = 2;
    resonance.gain.value = 4;

    // Wind volume - starts at 0, will be crossfaded by weather system
    const windGain = ctx.createGain();
    windGain.gain.value = 0; // Start silent, will fade in during snow

    // Connect wind audio chain
    windNode.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(resonance);
    resonance.connect(windGain);
    windGain.connect(gainNode);
    windNode.start();
    audioState.current.windNode = windNode;
    audioState.current.windGainNode = windGain;

    // Add gentle high-frequency shimmer for snow texture
    const shimmerBuffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const shimmerData = shimmerBuffer.getChannelData(0);
    for (let i = 0; i < shimmerData.length; i++) {
      // Sparse, gentle tinkles
      const chance = Math.random();
      shimmerData[i] = chance > 0.995 ? (Math.random() - 0.5) * 0.3 : shimmerData[Math.max(0, i - 1)] * 0.98;
    }

    const shimmerNode = ctx.createBufferSource();
    shimmerNode.buffer = shimmerBuffer;
    shimmerNode.loop = true;

    const shimmerHighpass = ctx.createBiquadFilter();
    shimmerHighpass.type = 'highpass';
    shimmerHighpass.frequency.value = 4000;

    const shimmerGain = ctx.createGain();
    shimmerGain.gain.value = 0; // Will follow wind gain

    shimmerNode.connect(shimmerHighpass);
    shimmerHighpass.connect(shimmerGain);
    shimmerGain.connect(gainNode);
    shimmerNode.start();
  };

  // Create birds/nature ambience for sunny weather
  const createBirdsAmbience = (ctx: AudioContext, gainNode: GainNode) => {
    // Create a buffer with synthesized bird-like chirps
    const bufferSize = ctx.sampleRate * 8;
    const birdsBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    const leftChannel = birdsBuffer.getChannelData(0);
    const rightChannel = birdsBuffer.getChannelData(1);

    // Generate bird chirp patterns
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;

      // Multiple bird "voices" at different intervals
      let chirpValue = 0;

      // Bird 1: High pitched chirp every ~2 seconds
      const bird1Phase = (t % 2.3) * 2 * Math.PI;
      if (t % 2.3 < 0.15) {
        const chirpEnv = Math.sin((t % 2.3) / 0.15 * Math.PI);
        const freq = 2000 + Math.sin(bird1Phase * 8) * 500;
        chirpValue += Math.sin(t * freq * 2 * Math.PI) * chirpEnv * 0.15;
      }

      // Bird 2: Lower trill every ~3.5 seconds
      if (t % 3.5 < 0.3) {
        const trillPhase = (t % 3.5) / 0.3;
        const trillEnv = Math.sin(trillPhase * Math.PI) * (1 - trillPhase * 0.5);
        const trillFreq = 1200 + Math.sin(trillPhase * 20 * Math.PI) * 300;
        chirpValue += Math.sin(t * trillFreq * 2 * Math.PI) * trillEnv * 0.12;
      }

      // Bird 3: Quick double chirp every ~4 seconds
      const bird3Time = t % 4.2;
      if (bird3Time < 0.08 || (bird3Time > 0.12 && bird3Time < 0.2)) {
        const chirpEnv = Math.sin(((bird3Time < 0.08 ? bird3Time : bird3Time - 0.12) / 0.08) * Math.PI);
        chirpValue += Math.sin(t * 2800 * 2 * Math.PI) * chirpEnv * 0.1;
      }

      // Distant bird 4: Very faint, longer call
      if (t % 5.7 < 0.4) {
        const callPhase = (t % 5.7) / 0.4;
        const callEnv = Math.sin(callPhase * Math.PI) * 0.5;
        const callFreq = 800 + callPhase * 400;
        chirpValue += Math.sin(t * callFreq * 2 * Math.PI) * callEnv * 0.06;
      }

      // Soft background rustling (leaves in breeze)
      const rustleNoise = (Math.random() - 0.5) * 0.02;
      const rustleEnv = 0.3 + Math.sin(t * 0.5) * 0.2;

      // Stereo spread - slightly different timing for each channel
      leftChannel[i] = chirpValue + rustleNoise * rustleEnv;
      rightChannel[i] = chirpValue * 0.8 + rustleNoise * rustleEnv * 1.2;
    }

    const birdsNode = ctx.createBufferSource();
    birdsNode.buffer = birdsBuffer;
    birdsNode.loop = true;

    // Bandpass to make it sound more natural/distant
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 500;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 6000;

    // Birds volume - starts at 0, fades in during sunny weather
    const birdsGain = ctx.createGain();
    birdsGain.gain.value = 0;

    // Connect birds audio chain
    birdsNode.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(birdsGain);
    birdsGain.connect(gainNode);
    birdsNode.start();
    audioState.current.birdsNode = birdsNode;
    audioState.current.birdsGainNode = birdsGain;

    // Add gentle ambient nature hum (insects, distant sounds)
    const natureBuffer = ctx.createBuffer(1, ctx.sampleRate * 6, ctx.sampleRate);
    const natureData = natureBuffer.getChannelData(0);
    let prevSample = 0;
    for (let i = 0; i < natureData.length; i++) {
      // Very subtle filtered noise
      const noise = (Math.random() - 0.5) * 0.1;
      prevSample = prevSample * 0.95 + noise * 0.05;
      natureData[i] = prevSample;
    }

    const natureNode = ctx.createBufferSource();
    natureNode.buffer = natureBuffer;
    natureNode.loop = true;

    const natureHighpass = ctx.createBiquadFilter();
    natureHighpass.type = 'highpass';
    natureHighpass.frequency.value = 200;

    const natureLowpass = ctx.createBiquadFilter();
    natureLowpass.type = 'lowpass';
    natureLowpass.frequency.value = 2000;

    const natureGain = ctx.createGain();
    natureGain.gain.value = 0; // Will follow birds gain

    natureNode.connect(natureHighpass);
    natureHighpass.connect(natureLowpass);
    natureLowpass.connect(natureGain);
    natureGain.connect(gainNode);
    natureNode.start();
  };

  // Update audio volumes based on current weather
  const startWeatherAudioUpdates = () => {
    const updateWeatherAudio = () => {
      const weather = getCurrentWeather();
      const ctx = audioState.current.ambientContext;
      const rainGain = audioState.current.rainGainNode;
      const windGain = audioState.current.windGainNode;
      const birdsGain = audioState.current.birdsGainNode;

      if (!ctx || !rainGain || !windGain || !birdsGain) return;

      // Smooth crossfade based on weather type and intensity
      const targetRainVolume = weather.type === 'rain' ? 0.12 * weather.intensity : 0;
      const targetWindVolume = weather.type === 'snow' ? 0.08 * weather.intensity : 0;
      const targetBirdsVolume = weather.type === 'sunny' ? 0.15 * weather.intensity : 0;

      // Smooth transition over 100ms
      const now = ctx.currentTime;
      rainGain.gain.cancelScheduledValues(now);
      windGain.gain.cancelScheduledValues(now);
      birdsGain.gain.cancelScheduledValues(now);
      rainGain.gain.setValueAtTime(rainGain.gain.value, now);
      windGain.gain.setValueAtTime(windGain.gain.value, now);
      birdsGain.gain.setValueAtTime(birdsGain.gain.value, now);
      rainGain.gain.linearRampToValueAtTime(targetRainVolume, now + 0.1);
      windGain.gain.linearRampToValueAtTime(targetWindVolume, now + 0.1);
      birdsGain.gain.linearRampToValueAtTime(targetBirdsVolume, now + 0.1);
    };

    // Update every 100ms
    audioState.current.weatherUpdateInterval = window.setInterval(updateWeatherAudio, 100);
  };

  // Create distant thunder rumbles at random intervals
  const startThunderEffects = (ctx: AudioContext, gainNode: GainNode) => {
    // Helper to play the actual thunder sound
    const playThunderSound = (distance: number) => {
      if (!audioState.current.ambientContext) return;

      // Thunder duration and volume based on distance
      // Closer = shorter, louder; Farther = longer rumble, quieter
      const thunderDuration = 2 + Math.random() * 2 + distance * 0.5;
      const thunderBuffer = ctx.createBuffer(2, ctx.sampleRate * thunderDuration, ctx.sampleRate);
      const leftData = thunderBuffer.getChannelData(0);
      const rightData = thunderBuffer.getChannelData(1);

      // Generate rumbling thunder noise
      let rumble = 0;
      for (let i = 0; i < thunderBuffer.length; i++) {
        const t = i / ctx.sampleRate;
        // Envelope: fade in, sustain, long fade out
        // Distant thunder has slower attack
        const attackTime = 0.1 + distance * 0.1;
        const envelope =
          t < attackTime
            ? t / attackTime
            : t < thunderDuration * 0.4
              ? 1
              : Math.pow(1 - (t - thunderDuration * 0.4) / (thunderDuration * 0.6), 2);

        // Low frequency rumble with some randomness
        rumble = rumble * 0.98 + (Math.random() * 2 - 1) * 0.02;
        const noise = rumble + (Math.random() * 2 - 1) * 0.4;

        // Add some rolling variation
        const roll = Math.sin(t * 3 + Math.random() * 0.5) * 0.4 + 0.6;

        leftData[i] = noise * envelope * roll;
        rightData[i] = (rumble + (Math.random() * 2 - 1) * 0.4) * envelope * roll;
      }

      const thunderNode = ctx.createBufferSource();
      thunderNode.buffer = thunderBuffer;

      // Low pass for deep rumble - less aggressive filtering for more presence
      const thunderLowpass = ctx.createBiquadFilter();
      thunderLowpass.type = 'lowpass';
      thunderLowpass.frequency.value = 350 - distance * 40 + Math.random() * 50;
      thunderLowpass.Q.value = 0.7;

      // Thunder volume - significantly increased for prominence
      const thunderGain = ctx.createGain();
      const baseVolume = 0.7 - distance * 0.1;
      thunderGain.gain.value = Math.max(0.25, baseVolume + Math.random() * 0.1);

      thunderNode.connect(thunderLowpass);
      thunderLowpass.connect(thunderGain);
      thunderGain.connect(gainNode);
      thunderNode.start();
    };

    const triggerLightningAndThunder = () => {
      // Random delay between storms (15-45 seconds)
      const nextStormDelay = 15000 + Math.random() * 30000;

      audioState.current.thunderInterval = window.setTimeout(() => {
        if (!audioState.current.ambientContext) return;

        // Simulate distance (0 = close, 4 = very far)
        // Sound travels ~343m/s, so 1 second delay ≈ 343m ≈ 0.2 miles
        // We'll use 0.5-3 seconds delay for realism (close to medium distance)
        const distance = Math.random() * 4;
        const soundDelay = 500 + distance * 700; // 500ms to 3300ms delay

        // Trigger lightning visual effect FIRST
        if (typeof window !== 'undefined' && (window as unknown as { triggerLightning?: () => void }).triggerLightning) {
          (window as unknown as { triggerLightning: () => void }).triggerLightning();
        }

        // Play thunder sound AFTER realistic delay based on distance
        setTimeout(() => {
          playThunderSound(distance);
        }, soundDelay);

        // Schedule next lightning/thunder
        triggerLightningAndThunder();
      }, nextStormDelay);
    };

    // Start first thunder after a delay
    triggerLightningAndThunder();
  };

  // Play death sound effect
  const playDeathSound = useCallback(() => {
    const ctx = audioState.current.ambientContext;
    const gainNode = audioState.current.gainNode;
    if (!ctx || !gainNode) return;

    // Deep impact sound
    const impactOsc = ctx.createOscillator();
    const impactGain = ctx.createGain();
    impactOsc.type = 'sine';
    impactOsc.frequency.value = 80;
    impactGain.gain.setValueAtTime(0.5, ctx.currentTime);
    impactGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    impactOsc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.3);
    impactOsc.connect(impactGain);
    impactGain.connect(gainNode);
    impactOsc.start();
    impactOsc.stop(ctx.currentTime + 0.5);

    // Noise burst
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.1));
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.3;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 500;

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(gainNode);
    noiseSource.start();
  }, []);

  // Play jump sound
  const playJumpSound = useCallback(() => {
    const ctx = audioState.current.ambientContext;
    const gainNode = audioState.current.gainNode;
    if (!ctx || !gainNode) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(gainNode);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }, []);

  // Play landing sound
  const playLandSound = useCallback(() => {
    const ctx = audioState.current.ambientContext;
    const gainNode = audioState.current.gainNode;
    if (!ctx || !gainNode) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(gainNode);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }, []);

  // Play checkpoint sound
  const playCheckpointSound = useCallback(() => {
    const ctx = audioState.current.ambientContext;
    const gainNode = audioState.current.gainNode;
    if (!ctx || !gainNode) return;

    // Pleasant arpeggio
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

      osc.connect(gain);
      gain.connect(gainNode);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }, []);

  // Start/stop audio based on playing state
  useEffect(() => {
    if (isPlaying) {
      initAudio();
      // Resume context if suspended (browser autoplay policy)
      audioState.current.ambientContext?.resume();
    }

    return () => {
      // Cleanup on unmount
      audioState.current.oscillators.forEach((osc) => {
        try {
          osc.stop();
        } catch {
          // Already stopped
        }
      });
      audioState.current.noiseNode?.stop();
      audioState.current.rainNode?.stop();
      audioState.current.windNode?.stop();
      audioState.current.birdsNode?.stop();
      if (audioState.current.thunderInterval) {
        clearTimeout(audioState.current.thunderInterval);
      }
      if (audioState.current.weatherUpdateInterval) {
        clearInterval(audioState.current.weatherUpdateInterval);
      }
      audioState.current.ambientContext?.close();
    };
  }, [isPlaying, initAudio]);

  // Update volume
  useEffect(() => {
    if (audioState.current.gainNode) {
      audioState.current.gainNode.gain.value = volume;
    }
  }, [volume]);

  return {
    playDeathSound,
    playJumpSound,
    playLandSound,
    playCheckpointSound,
  };
}

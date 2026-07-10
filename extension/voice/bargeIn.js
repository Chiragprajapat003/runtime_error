/**
 * bargeIn.js
 * 
 * Coordinates Speech Recognition during Speech Synthesis to allow users to interrupt (barge-in).
 */

export class BargeInManager {
  /**
   * @param {TTSController} ttsController 
   * @param {STTController} sttController 
   */
  constructor(ttsController, sttController) {
    this.tts = ttsController;
    this.stt = sttController;
    this.isBargeInActive = false;
  }

  /**
   * Starts playback and keeps the mic active in low-threshold mode to detect interruptions.
   */
  speakWithInterrupt(text, onBoundary, onEnd) {
    this.isBargeInActive = true;

    // Start speaking
    this.tts.speak(
      text,
      onBoundary,
      () => {
        this.isBargeInActive = false;
        if (onEnd) onEnd();
      },
      (err) => {
        console.error('Barge-in TTS Error:', err);
        this.isBargeInActive = false;
      }
    );

    // Run STT listener concurrently
    this.stt.start(
      (result) => {
        // If final or interim speech is registered, cancel TTS immediately (Barge-in trigger)
        if (result.final || result.interim) {
          console.log('[BargeIn] User voice detected. Interrupting playback.');
          this.tts.stop();
          this.isBargeInActive = false;
        }
      },
      () => {
        // STT finished
      },
      (err) => {
        console.warn('[BargeIn] STT warning:', err);
      }
    );
  }

  /**
   * Manually stop everything
   */
  cancel() {
    this.tts.stop();
    this.stt.stop();
    this.isBargeInActive = false;
  }
}

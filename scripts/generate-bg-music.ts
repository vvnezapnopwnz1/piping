import * as fs from "fs"
import * as path from "path"

/**
 * Synthesizes a calm, elegant ambient corporate tech background soundtrack (44.1kHz 16-bit stereo WAV).
 * Designed for product demos and presentations — warm pads, gentle harmonic chords, subtle melodic bells.
 */
export function generateAmbientMusic(outputPath: string, durationSec = 180) {
  const sampleRate = 44100
  const numChannels = 2
  const numSamples = sampleRate * durationSec
  const bytesPerSample = 2
  const blockAlign = numChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = numSamples * blockAlign
  const headerSize = 44
  const totalSize = headerSize + dataSize

  const buffer = Buffer.alloc(totalSize)

  // RIFF header
  buffer.write("RIFF", 0)
  buffer.writeUInt32LE(totalSize - 8, 4)
  buffer.write("WAVE", 8)
  buffer.write("fmt ", 12)
  buffer.writeUInt32LE(16, 16) // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20) // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(byteRate, 28)
  buffer.writeUInt16LE(blockAlign, 32)
  buffer.writeUInt16LE(16, 34) // BitsPerSample
  buffer.write("data", 36)
  buffer.writeUInt32LE(dataSize, 40)

  // Chord progression in Hz:
  // Cmaj9: C3 (130.81), E3 (164.81), G3 (196.00), B3 (246.94), D4 (293.66)
  // Am9:   A2 (110.00), C3 (130.81), E3 (164.81), G3 (196.00), B3 (246.94)
  // Fmaj7: F2 (87.31),  A2 (110.00), C3 (130.81), E3 (164.81), G3 (196.00)
  // Gsus4: G2 (98.00),  C3 (130.81), D3 (146.83), G3 (196.00), D4 (293.66)
  const chords = [
    [130.81, 164.81, 196.0, 246.94, 293.66, 392.0], // Cmaj9
    [110.0, 164.81, 196.0, 246.94, 329.63, 440.0],  // Am9
    [87.31, 130.81, 174.61, 220.0, 261.63, 329.63], // Fmaj7
    [98.0, 146.83, 196.0, 261.63, 293.66, 392.0],   // Gadd9
  ]

  const chordDurationSec = 6 // 6 seconds per chord
  const cycleDurationSec = chords.length * chordDurationSec // 24 sec cycle

  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    const cycleTime = t % cycleDurationSec
    const chordIndex = Math.floor(cycleTime / chordDurationSec)
    const chord = chords[chordIndex]
    const chordLocalTime = cycleTime % chordDurationSec
    const chordProgress = chordLocalTime / chordDurationSec

    // Smooth envelope for chord transition (fade in/out)
    const padEnv = Math.sin(Math.PI * chordProgress)

    // Layer 1: Warm Pad (additive sines with slight detune and chorusing)
    let padLeft = 0
    let padRight = 0
    for (let f = 0; f < chord.length; f++) {
      const freq = chord[f]
      const detune = Math.sin(t * 0.5 + f) * 0.4
      const p1 = Math.sin(2 * Math.PI * (freq + detune) * t)
      const p2 = Math.sin(2 * Math.PI * (freq * 1.003 - detune) * t)
      const amp = 0.04 / (f * 0.3 + 1)
      padLeft += p1 * amp
      padRight += p2 * amp
    }
    padLeft *= padEnv
    padRight *= padEnv

    // Layer 2: Ambient Bell Arpeggio (gentle 8th notes)
    const bpm = 110
    const beatDuration = 60 / bpm
    const arpStep = Math.floor(t / (beatDuration / 2)) % chord.length
    const arpFreq = chord[arpStep] * 2 // an octave higher
    const arpTime = (t % (beatDuration / 2)) / (beatDuration / 2)
    const arpEnv = Math.exp(-arpTime * 6) // sharp bell decay
    const arpTone = Math.sin(2 * Math.PI * arpFreq * t) * Math.exp(-arpTime * 3) +
                    Math.sin(2 * Math.PI * arpFreq * 2.01 * t) * Math.exp(-arpTime * 8) * 0.3
    const arpPan = Math.sin(t * 0.8) * 0.4 // gentle stereo pan
    const arpLeft = arpTone * (0.5 - arpPan) * arpEnv * 0.025
    const arpRight = arpTone * (0.5 + arpPan) * arpEnv * 0.025

    // Layer 3: Warm Sub Bass
    const bassFreq = chord[0] / 2
    const bassTone = Math.sin(2 * Math.PI * bassFreq * t) * 0.05 * Math.min(1, padEnv * 1.5)

    // Master sum
    let left = padLeft + arpLeft + bassTone * 0.6
    let right = padRight + arpRight + bassTone * 0.6

    // Overall intro/outro master fade
    const masterFadeIn = Math.min(1, t / 2.0)
    const masterFadeOut = Math.min(1, (durationSec - t) / 2.0)
    const masterFade = masterFadeIn * masterFadeOut

    left = Math.max(-1, Math.min(1, left * masterFade))
    right = Math.max(-1, Math.min(1, right * masterFade))

    const intLeft = Math.round(left * 32767)
    const intRight = Math.round(right * 32767)

    buffer.writeInt16LE(intLeft, offset)
    buffer.writeInt16LE(intRight, offset + 2)
    offset += 4
  }

  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(outputPath, buffer)
  console.log(`🎵 Background audio generated successfully: ${outputPath} (${(dataSize / 1024 / 1024).toFixed(2)} MB)`)
}

if (process.argv[1] && process.argv[1].endsWith("generate-bg-music.ts")) {
  const target = path.join(process.cwd(), "demo-video", "bg-music.wav")
  generateAmbientMusic(target)
}

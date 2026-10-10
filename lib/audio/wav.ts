// Browser-side: decode any audio the browser can play (webm, mp3, m4a, wav...) and re-encode it as
// 16 kHz mono 16-bit WAV, a format OpenRouter accepts. Speech needs no more than 16 kHz.
const TARGET_RATE = 16_000;
export const MAX_SECONDS = 120; // ~3.8 MB of WAV, under the 4.5 MB request limit on Vercel

export async function toWav16kMono(input: Blob): Promise<{ wav: Blob; seconds: number }> {
  const ctx = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(await input.arrayBuffer());
  } finally {
    void ctx.close();
  }
  if (decoded.duration > MAX_SECONDS) {
    throw new Error(`Recording is ${Math.round(decoded.duration)} s; the limit is ${MAX_SECONDS} s.`);
  }
  const frames = Math.ceil(decoded.duration * TARGET_RATE);
  const offline = new OfflineAudioContext(1, frames, TARGET_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded; // multi-channel input is down-mixed to mono by the 1-channel context
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return { wav: encodeWav(rendered.getChannelData(0), TARGET_RATE), seconds: decoded.duration };
}

function encodeWav(samples: Float32Array, rate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buffer);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true); // PCM chunk size
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); // byte rate
  v.setUint16(32, 2, true); // block align
  v.setUint16(34, 16, true); // bits per sample
  str(36, "data");
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

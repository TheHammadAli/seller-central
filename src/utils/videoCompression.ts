// Shrinks a picked video before upload, with the Fazl app's own rules
// (Native-fazl-app/src/utils/videoCompression.js) so videos posted from either
// app look and weigh the same: at most 60 s, long edge 1280 px, about 8 MB.
import { getVideoMetaData, Video } from 'react-native-compressor';
import { t } from '../i18n';

export const MAX_VIDEO_SECONDS = 60;
const MAX_DIMENSION = 1280;
const TARGET_BYTES = 8 * 1024 * 1024;
/** Over this after the first pass, one more pass at a lower bitrate. */
const MAX_OUTPUT_BYTES = 10 * 1024 * 1024;
const AUDIO_BITRATE = 96_000;
const MIN_VIDEO_BITRATE = 2_500_000;
const MAX_VIDEO_BITRATE = 4_000_000;

export class VideoTooLongError extends Error {
  constructor(seconds: number) {
    super(t('Video must be {seconds} seconds or less (this one is {length} s).', {
        seconds: MAX_VIDEO_SECONDS,
        length: Math.round(seconds),
      }));
    this.name = 'VideoTooLongError';
  }
}

export interface ReadyVideo {
  uri: string;
  name: string;
  type: string;
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

const bitrateFor = (seconds: number) =>
  Math.round(clamp((TARGET_BYTES * 8) / seconds - AUDIO_BITRATE, MIN_VIDEO_BITRATE, MAX_VIDEO_BITRATE));

const withScheme = (uri: string) =>
  uri.startsWith('file://') || uri.startsWith('content://') ? uri : `file://${uri}`;

async function meta(uri: string) {
  try {
    return await getVideoMetaData(uri);
  } catch {
    return null;
  }
}

const pass = (uri: string, bitrate: number, onProgress?: (p: number) => void) =>
  Video.compress(
    uri,
    { compressionMethod: 'manual', maxSize: MAX_DIMENSION, bitrate, stripAudio: false, progressDivider: 5 },
    p => onProgress?.(clamp(Number(p) || 0, 0, 1)),
  );

/**
 * The video ready to upload: refused over 60 s, passed through untouched when
 * it's already small enough, else compressed (twice if the first pass is
 * still too big).
 */
export async function prepareVideo(
  picked: { uri: string; fileName?: string; type?: string; duration?: number; fileSize?: number },
  onProgress?: (progress: number) => void,
): Promise<ReadyVideo> {
  const info = await meta(picked.uri);
  const seconds = Number(info?.duration) || Number(picked.duration) || 0;
  if (!seconds) throw new Error(t("Couldn't read this video. Please try a different one."));
  if (seconds > MAX_VIDEO_SECONDS + 0.5) throw new VideoTooLongError(seconds);

  const longEdge = Math.max(Number(info?.width) || 0, Number(info?.height) || 0);
  const size = Number(info?.size) || Number(picked.fileSize) || 0;
  if (size > 0 && size <= MAX_OUTPUT_BYTES && longEdge > 0 && longEdge <= MAX_DIMENSION) {
    return {
      uri: picked.uri,
      name: picked.fileName || `video_${Date.now()}.mp4`,
      type: picked.type || 'video/mp4',
    };
  }

  const bitrate = bitrateFor(seconds);
  let out = await pass(picked.uri, bitrate, onProgress);
  const firstSize = Number((await meta(out))?.size) || 0;
  if (firstSize > MAX_OUTPUT_BYTES && bitrate > MIN_VIDEO_BITRATE) {
    const lower = Math.round(clamp(bitrate * (TARGET_BYTES / firstSize), MIN_VIDEO_BITRATE, bitrate));
    if (lower < bitrate) {
      try {
        const second = await pass(picked.uri, lower, onProgress);
        const secondSize = Number((await meta(second))?.size) || 0;
        if (secondSize > 0 && secondSize < firstSize) out = second;
      } catch {
        // Keep the first pass.
      }
    }
  }
  return { uri: withScheme(out), name: `video_${Date.now()}.mp4`, type: 'video/mp4' };
}

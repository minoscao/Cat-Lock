const CLIPS = {
  idle: { name: '坐下待机', source: '/videos/cat/sit-blink.mp4' },
  blink: { name: '眨眼', source: '/videos/cat/sit-blink.mp4' },
  groom: { name: '舔爪', source: '/videos/cat/sit-to-groom.mp4' },
  sleepDown: { name: '趴下入睡', source: '/videos/cat/sit-to-sleep.mp4' },
  sleeping: { name: '睡觉中', source: '/videos/cat/sleeping.mp4' },
  wake: { name: '醒来坐好', source: '/videos/cat/sleep-to-sit.mp4' }
};

const SEQUENCES = {
  blink: [CLIPS.blink, CLIPS.idle],
  groom: [CLIPS.groom, CLIPS.idle],
  sleep: [CLIPS.sleepDown, CLIPS.sleeping, CLIPS.sleeping, CLIPS.wake, CLIPS.idle]
};

const canvas = document.querySelector('#catActionCanvas');
const output = canvas.getContext('2d');
const sourceCanvas = document.createElement('canvas');
sourceCanvas.width = 480;
sourceCanvas.height = 270;
const source = sourceCanvas.getContext('2d', { willReadFrequently: true });
const status = document.querySelector('#actionStatus');

let currentVideo;
let currentFrame;
let queue = [];
let isIdle = true;
let catAnchor;
let clipOffset;
let stabilizePosition = false;
let catSleepAnchor;

function clearVideo() {
  cancelAnimationFrame(currentFrame);
  currentVideo?.pause();
  currentVideo = undefined;
}

function cleanGreenScreen(frame, width, height) {
  const background = new Uint8Array(width * height);
  for (let index = 0; index < frame.data.length; index += 4) {
    const red = frame.data[index];
    const green = frame.data[index + 1];
    const blue = frame.data[index + 2];
    const greenDifference = green - Math.max(red, blue);
    if (green > 85 && greenDifference > 22) {
      background[index / 4] = 1;
      frame.data[index + 3] *= Math.max(0, Math.min(1, (52 - greenDifference) / 30));
    }
  }
  for (let pixel = 0; pixel < background.length; pixel += 1) {
    if (background[pixel]) continue;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const neighbours = [pixel - 1, pixel + 1, pixel - width, pixel + width];
    const touchesBackground = neighbours.some((neighbour) => neighbour >= 0 && neighbour < background.length && background[neighbour] && (x > 0 || neighbour !== pixel - 1) && (x < width - 1 || neighbour !== pixel + 1) && (y > 0 || neighbour !== pixel - width) && (y < height - 1 || neighbour !== pixel + width));
    if (!touchesBackground) continue;
    const index = pixel * 4;
    const red = frame.data[index];
    const green = frame.data[index + 1];
    const blue = frame.data[index + 2];
    const greenDifference = green - Math.max(red, blue);
    if (green > 65 && greenDifference > 5) {
      frame.data[index + 3] *= Math.max(.1, Math.min(1, (26 - greenDifference) / 21));
      frame.data[index + 1] = Math.min(green, Math.max(red, blue) + 5);
    }
  }
}

function findCatAnchor(frame, width, height) {
  let minX = width;
  let maxX = -1;
  let maxY = -1;
  for (let index = 0; index < frame.data.length; index += 4) {
    if (frame.data[index + 3] < 45) continue;
    const pixel = index / 4;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (maxX < 0) return undefined;

  const centralLeft = minX + (maxX - minX) * .22;
  const centralRight = maxX - (maxX - minX) * .22;
  let contactY = -1;
  for (let index = 0; index < frame.data.length; index += 4) {
    if (frame.data[index + 3] < 110) continue;
    const pixel = index / 4;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x < centralLeft || x > centralRight) continue;
    contactY = Math.max(contactY, y);
  }
  if (contactY < 0) return { x: (minX + maxX) / 2, y: maxY };

  let groundX = 0;
  let groundY = 0;
  let groundPixels = 0;
  for (let index = 0; index < frame.data.length; index += 4) {
    if (frame.data[index + 3] < 110) continue;
    const pixel = index / 4;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x < centralLeft || x > centralRight || y < contactY - 5) continue;
    groundX += x;
    groundY += y;
    groundPixels += 1;
  }
  return groundPixels ? { x: groundX / groundPixels, y: groundY / groundPixels } : { x: (minX + maxX) / 2, y: maxY };
}

function drawFrame(video) {
  if (currentVideo !== video) return;
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    source.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
    source.drawImage(video, 0, 0, sourceCanvas.width, sourceCanvas.height);
    const frame = source.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    cleanGreenScreen(frame, sourceCanvas.width, sourceCanvas.height);
    source.putImageData(frame, 0, 0);
    const anchor = findCatAnchor(frame, sourceCanvas.width, sourceCanvas.height);
  if (anchor) {
    if (stabilizePosition && catAnchor) {
      catSleepAnchor ||= { ...catAnchor };
      const lockClipPosition = [CLIPS.sleeping.source, CLIPS.wake.source].includes(currentVideo.src.replace(location.origin, ''));
      if (!clipOffset || !lockClipPosition) clipOffset = { x: catSleepAnchor.x - anchor.x, y: catSleepAnchor.y - anchor.y };
      catAnchor = { ...catSleepAnchor };
      } else {
        if (!clipOffset) clipOffset = catAnchor ? { x: catAnchor.x - anchor.x, y: catAnchor.y - anchor.y } : { x: 0, y: 0 };
        catAnchor = { x: anchor.x + clipOffset.x, y: anchor.y + clipOffset.y };
      }
      output.clearRect(0, 0, canvas.width, canvas.height);
      output.drawImage(sourceCanvas, clipOffset.x * canvas.width / sourceCanvas.width, clipOffset.y * canvas.height / sourceCanvas.height, canvas.width, canvas.height);
    }
  }
  currentFrame = requestAnimationFrame(() => drawFrame(video));
}

function updateStatus() {
  const next = queue[0]?.name;
  status.textContent = next ? `当前：${isIdle ? '坐下待机' : '动作中'}，下一项：${next}` : isIdle ? '坐下待机' : '动作中';
}

function playClip(clip, onEnded) {
  clearVideo();
  clipOffset = undefined;
  stabilizePosition = [CLIPS.sleepDown.source, CLIPS.sleeping.source, CLIPS.wake.source].includes(clip.source);
  if (clip === CLIPS.idle) catSleepAnchor = undefined;
  isIdle = clip === CLIPS.idle;
  updateStatus();
  const video = document.createElement('video');
  currentVideo = video;
  video.src = clip.source;
  video.muted = true;
  video.playsInline = true;
  video.addEventListener('loadeddata', () => {
    if (currentVideo !== video) return;
    video.play();
    drawFrame(video);
  }, { once: true });
  video.addEventListener('ended', () => {
    if (currentVideo === video) onEnded();
  });
}

function playNext() {
  const next = queue.shift();
  if (next) {
    playClip(next, playNext);
    return;
  }
  playIdleLoop();
}

function playIdleLoop() {
  playClip(CLIPS.idle, () => {
    if (queue.length) playNext();
    else playIdleLoop();
  });
}

function enqueue(sequence) {
  queue.push(...sequence);
  updateStatus();
}

document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;
    const sequence = action === 'random'
      ? SEQUENCES[Math.random() < .5 ? 'blink' : 'groom']
      : SEQUENCES[action];
    enqueue(sequence);
  });
});

playIdleLoop();

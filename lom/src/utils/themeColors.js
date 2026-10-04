// Existing palette values remain unchanged; derive readable page accents, not a second theme.
export function colorLuminance(hex) {
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((part) => parseInt(part, 16) / 255);
  const linear = channels.map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

export function colorContrast(first, second) {
  const a = colorLuminance(first),
    b = colorLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function readableAccent(primary, background) {
  const channels = primary
    .slice(1)
    .match(/../g)
    .map((part) => parseInt(part, 16));
  let color = primary;
  const lightBackground = colorLuminance(background) > 0.5;
  // All existing dark palettes pass unchanged; light accents need a little tint headroom.
  const minimum = lightBackground ? 4.8 : 4.5;
  for (let step = 1; colorContrast(color, background) < minimum && step <= 100; step++) {
    color = `#${channels
      .map((value) =>
        Math.round(lightBackground ? value * (1 - step / 100) : value + ((255 - value) * step) / 100)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')}`;
  }
  return color;
}

export function accentText(accent) {
  return colorContrast(accent, '#000000') >= colorContrast(accent, '#ffffff') ? '#000000' : '#ffffff';
}

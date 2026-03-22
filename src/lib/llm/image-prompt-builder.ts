// 将角色外貌/漫画面板描述转换为 SD 风格英文 prompt

const QUALITY_TAGS = 'masterpiece, best quality, anime style, highres, ultra-detailed';
const DEFAULT_NEGATIVE = 'lowres, bad anatomy, text, watermark, nsfw, worst quality, low quality, blurry';

export function buildCharacterImagePrompt(appearance: {
  hair?: string;
  eyes?: string;
  height?: string;
  clothing?: string;
  distinctive_features?: string;
}, gender?: string): { prompt: string; negative_prompt: string } {
  const genderTag = gender && /女|female|girl/i.test(gender) ? '1girl' :
                    gender && /男|male|boy/i.test(gender) ? '1boy' :
                    '1girl';
  const parts = [QUALITY_TAGS, `${genderTag}, solo, standing, full body`];

  if (appearance.hair) parts.push(appearance.hair);
  if (appearance.eyes) parts.push(appearance.eyes);
  if (appearance.clothing) parts.push(appearance.clothing);
  if (appearance.distinctive_features) parts.push(appearance.distinctive_features);

  parts.push('simple background, white background');

  return {
    prompt: parts.join(', '),
    negative_prompt: DEFAULT_NEGATIVE,
  };
}

export function buildPanelImagePrompt(panel: {
  scene?: string;
  characters?: string[];
  visual_focus?: string;
}): { prompt: string; negative_prompt: string } {
  const parts = [QUALITY_TAGS, 'anime screenshot, manga panel'];

  if (panel.scene) parts.push(panel.scene);
  if (panel.visual_focus) parts.push(panel.visual_focus);
  if (panel.characters?.length) {
    parts.push(panel.characters.join(', '));
  }

  return {
    prompt: parts.join(', '),
    negative_prompt: DEFAULT_NEGATIVE,
  };
}

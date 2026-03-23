// 将角色外貌/漫画面板描述转换为图像生成提示词
// 支持中文（即梦AI/豆包）和英文（SD/Midjourney）两种格式

// ============ 身高标签映射 ============
const HEIGHT_TAGS: Record<string, string> = {
  // 矮小系列
  '矮': '矮小身材，娇小体型，短小的身高比例',
  '娇小': '娇小玲珑，小巧可爱的身材，petite body',
  '很矮': '非常矮小，儿童般的身高，chibi proportions',

  // 中等系列
  '中等': '中等身高，标准体型，正常比例',
  '普通': '普通身高，均衡体型',

  // 高挑系列
  '高': '高挑身材，修长体型，长腿比例',
  '高挑': '高挑纤细，模特身材，slender tall figure，修长的双腿',
  '很高': '非常高大，towering height，超长腿，仰视视角',
};

// 身高相关的视角和构图
const HEIGHT_COMPOSITION: Record<string, string> = {
  '矮': '俯视角度，可爱的小巧比例',
  '娇小': '略微俯视，强调娇小感',
  '高': '略微仰视，强调高挑感',
  '高挑': '仰视角度，突出修长身材',
  '很高': '明显仰视，强调身高差',
};

// ============ 细节增强函数 ============

// 发型细节增强
function enhanceHairDescription(hair: string): string[] {
  const details: string[] = [hair];

  if (hair.includes('长发')) {
    details.push('发丝随风轻扬', '柔顺光泽', '飘逸的发梢');
  } else if (hair.includes('短发')) {
    details.push('利落的发型', '清爽的发梢');
  }

  if (hair.includes('卷发') || hair.includes('波浪')) {
    details.push('蓬松的卷度', '自然的波浪');
  }

  // 发色光泽
  if (hair.includes('银') || hair.includes('白')) {
    details.push('银色光泽', '月光般的发色');
  } else if (hair.includes('金') || hair.includes('黄')) {
    details.push('金色光泽', '阳光般的发色');
  } else if (hair.includes('黑')) {
    details.push('乌黑亮丽', '深邃的发色');
  }

  return details;
}

// 瞳色细节增强
function enhanceEyesDescription(eyes: string): string[] {
  const details: string[] = [eyes];

  if (eyes.includes('红')) {
    details.push('深邃的红宝石般瞳孔', '闪烁的红色光芒');
  } else if (eyes.includes('蓝')) {
    details.push('清澈的蓝宝石般瞳孔', '如海洋般的眼眸');
  } else if (eyes.includes('绿')) {
    details.push('翡翠般的绿色瞳孔', '神秘的绿色光芒');
  } else if (eyes.includes('金')) {
    details.push('璀璨的金色瞳孔', '如黄金般的眼眸');
  } else if (eyes.includes('紫')) {
    details.push('神秘的紫色瞳孔', '梦幻般的紫色光芒');
  }

  // 通用眼睛细节
  details.push('明亮的眼神', '细腻的瞳孔细节');

  return details;
}

// 服装细节增强
function enhanceClothingDescription(clothing: string): string[] {
  const details: string[] = [clothing];

  if (clothing.includes('连衣裙') || clothing.includes('裙子')) {
    details.push('裙摆随风摆动', '优雅的裙装');
  }

  if (clothing.includes('哥特') || clothing.includes('Gothic')) {
    details.push('精致的蕾丝装饰', '华丽的细节', '哥特式配饰');
  }

  if (clothing.includes('校服')) {
    details.push('整洁的校服', '清新的学生气息');
  }

  if (clothing.includes('和服') || clothing.includes('kimono')) {
    details.push('传统的和服', '优雅的日式服装');
  }

  // 材质细节
  details.push('精致的服装细节', '自然的褶皱');

  return details;
}

// 根据角色特征选择氛围词
function selectAtmosphere(appearance: any, gender: string): string[] {
  const atmosphere: string[] = [];

  // 根据性别
  if (gender === '女' || gender === 'female' || gender === 'girl') {
    atmosphere.push('优雅氛围', '梦幻感');
  } else {
    atmosphere.push('清爽氛围', '帅气感');
  }

  // 根据服装风格
  if (appearance.clothing?.includes('哥特')) {
    atmosphere.push('神秘氛围', '华丽感');
  } else if (appearance.clothing?.includes('校服')) {
    atmosphere.push('青春氛围', '清新感');
  } else if (appearance.clothing?.includes('和服')) {
    atmosphere.push('典雅氛围', '传统美感');
  }

  return atmosphere;
}

// ============ 主函数 ============

export function buildCharacterImagePrompt(
  appearance: {
    hair?: string;
    eyes?: string;
    height?: string;
    clothing?: string;
    distinctive_features?: string;
  },
  gender?: string,
  provider: 'jimeng' | 'doubao' = 'jimeng'
): { prompt: string; negative_prompt: string } {

  const parts: string[] = [];

  // 1. 基础质量标签（保持现有，不过度强化）
  parts.push('杰作', '最佳质量', '动漫风格', '高分辨率', '超精细');

  // 2. 性别和基础构图
  const genderTag = gender && /女|female|girl/i.test(gender) ? '1个女孩' :
                    gender && /男|male|boy/i.test(gender) ? '1个男孩' :
                    '1个女孩';
  parts.push(genderTag, '独自', '站立', '全身');

  // 3. ⭐ 身高信息（核心修复）
  if (appearance.height) {
    const heightTag = HEIGHT_TAGS[appearance.height] || appearance.height;
    parts.push(heightTag);

    // 添加相关的视角和构图
    const composition = HEIGHT_COMPOSITION[appearance.height];
    if (composition) {
      parts.push(composition);
    }
  }

  // 4. ⭐ 发型细节（增强）
  if (appearance.hair) {
    const hairDetails = enhanceHairDescription(appearance.hair);
    parts.push(...hairDetails);
  }

  // 5. ⭐ 瞳色细节（增强）
  if (appearance.eyes) {
    const eyesDetails = enhanceEyesDescription(appearance.eyes);
    parts.push(...eyesDetails);
  }

  // 6. ⭐ 服装细节（增强）
  if (appearance.clothing) {
    const clothingDetails = enhanceClothingDescription(appearance.clothing);
    parts.push(...clothingDetails);
  }

  // 7. 特殊特征
  if (appearance.distinctive_features) {
    parts.push(appearance.distinctive_features);
  }

  // 8. ⭐ 光照效果（自动添加）
  parts.push('柔和的顶光照明', '自然光线', '细腻的光影效果', '柔和的阴影');

  // 9. ⭐ 氛围词（自动添加）
  const atmosphere = selectAtmosphere(appearance, gender || '女');
  parts.push(...atmosphere);

  // 10. ⭐ 通用细节（自动添加）
  parts.push(
    '浅景深背景虚化',
    '细腻的皮肤质感',
    '精致的五官',
    '高质量渲染',
    '细节丰富'
  );

  // 11. 背景
  parts.push('简单背景', '白色背景');

  return {
    prompt: parts.join('，'),  // 中文逗号
    negative_prompt: '低分辨率，糟糕的解剖结构，文字，水印，NSFW，最差质量，低质量，模糊，畸形，多余的肢体',
  };
}

export function buildPanelImagePrompt(panel: {
  scene?: string;
  characters?: string[];
  visual_focus?: string;
}): { prompt: string; negative_prompt: string } {
  const parts: string[] = [];

  // 基础标签
  parts.push('杰作', '最佳质量', '动漫风格', '高分辨率', '超精细', '动漫截图', '漫画分镜');

  // 场景描述
  if (panel.scene) {
    parts.push(panel.scene);
  }

  // 视觉焦点
  if (panel.visual_focus) {
    parts.push(panel.visual_focus, '突出重点');
  }

  // 角色
  if (panel.characters?.length) {
    parts.push(...panel.characters);
  }

  // 漫画特有的细节
  parts.push('清晰的构图', '动态感', '漫画风格渲染');

  return {
    prompt: parts.join('，'),
    negative_prompt: '低分辨率，糟糕的解剖结构，文字，水印，NSFW，最差质量，低质量，模糊',
  };
}

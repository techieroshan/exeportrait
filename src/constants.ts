/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GenerationSettings {
  style: 'studio' | 'office' | 'neutral';
  attire: 'business-formal' | 'business-casual';
  retention: number; // 0 to 1, how much of original face to keep (conceptually)
}

export const EXECUTIVE_GUIDELINES = {
  composition: [
    "Perfectly straight frontal pose",
    "No side posture or head tilts",
    "Level shoulders and straight spine"
  ],
  grooming: [
    "Neatly arranged professional hair",
    "Properly groomed appearance",
    "Face centered and clear"
  ],
  background: [
    "Plain light neutral studio",
    "Soft office blur",
    "No distractions or patterns"
  ],
  dress: [
    "Straight, symmetrical formal suit",
    "Solid colors (Navy, Black, Grey)",
    "Professional business formal"
  ]
};

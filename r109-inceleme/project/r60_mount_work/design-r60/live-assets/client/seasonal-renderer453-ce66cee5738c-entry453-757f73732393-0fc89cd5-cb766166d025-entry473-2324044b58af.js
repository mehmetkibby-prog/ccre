// lib/seasonal-layouts.mjs
var winter = {
  bazaar: { props: [[1, 0.26, 0.26, 250], [0, 0.22, 0.32, 120], [3, 0.83, 0.37, 160], [2, 0.13, 0.48, 165], [2, 0.88, 0.61, 165], [4, 0.39, 0.135, 75, true], [4, 0.81, 0.18, 85, true], [5, 0.74, 0.79, 180], [0, 0.29, 0.78, 100]], lights: [[0.15, 0.18, 0.3, 0.13, 0.025], [0.36, 0.09, 0.59, 0.09, 0.035], [0.79, 0.14, 0.94, 0.27, 0.045], [0.09, 0.63, 0.15, 0.8, 0.025], [0.69, 0.91, 0.85, 0.83, 0.025]] },
  forest: { props: [[1, 0.37, 0.32, 270], [0, 0.35, 0.35, 130], [2, 0.19, 0.52, 185], [5, 0.65, 0.59, 190], [1, 0.73, 0.31, 230], [4, 0.22, 0.19, 100, true], [4, 0.62, 0.29, 115, true], [2, 0.39, 0.74, 185], [1, 0.62, 0.84, 245], [0, 0.65, 0.85, 125], [2, 0.82, 0.68, 180]], lights: [[0.26, 0.14, 0.37, 0.17, 0.025], [0.31, 0.37, 0.39, 0.34, 0.02], [0.61, 0.19, 0.68, 0.23, 0.025], [0.65, 0.62, 0.74, 0.64, 0.025], [0.38, 0.81, 0.46, 0.85, 0.02]] },
  frozen: { props: [[5, 0.34, 0.33, 245], [1, 0.57, 0.29, 280], [0, 0.59, 0.32, 135], [2, 0.32, 0.63, 190], [1, 0.68, 0.66, 290], [4, 0.55, 0.19, 120, true], [5, 0.81, 0.56, 230], [0, 0.19, 0.45, 130], [2, 0.42, 0.85, 200], [1, 0.24, 0.78, 240]], lights: [[0.12, 0.38, 0.23, 0.39, 0.018], [0.43, 0.14, 0.5, 0.14, 0.025], [0.53, 0.3, 0.59, 0.32, 0.02], [0.73, 0.6, 0.79, 0.64, 0.024], [0.33, 0.76, 0.39, 0.8, 0.02]] },
  black: { props: [[2, 0.16, 0.21, 200], [4, 0.47, 0.1, 120, true], [0, 0.22, 0.72, 155], [3, 0.83, 0.65, 200], [2, 0.8, 0.2, 200], [1, 0.34, 0.87, 235], [5, 0.69, 0.82, 230], [4, 0.89, 0.49, 100, true]], lights: [[0.09, 0.16, 0.21, 0.13, 0.026], [0.44, 0.065, 0.56, 0.065, 0.027], [0.79, 0.15, 0.91, 0.24, 0.02], [0.79, 0.77, 0.87, 0.71, 0.02]] },
  fishing: { props: [[1, 0.24, 0.22, 160], [0, 0.19, 0.26, 85], [2, 0.1, 0.51, 150], [2, 0.9, 0.56, 150], [5, 0.3, 0.87, 150], [4, 0.77, 0.18, 85, true], [0, 0.71, 0.88, 85]], lights: [[0.1, 0.38, 0.15, 0.29, 0.018], [0.82, 0.29, 0.9, 0.4, 0.02], [0.29, 0.9, 0.39, 0.94, 0.015]] },
  sanctum: { props: [[1, 0.33, 0.25, 170], [5, 0.67, 0.27, 150], [2, 0.24, 0.49, 155], [2, 0.77, 0.51, 155], [4, 0.45, 0.15, 65, true], [4, 0.57, 0.16, 65, true], [0, 0.33, 0.68, 85], [0, 0.67, 0.67, 85]], lights: [[0.31, 0.25, 0.38, 0.19, 0.012], [0.62, 0.19, 0.7, 0.25, 0.012], [0.3, 0.66, 0.35, 0.71, 0.01]] },
  sinsi: { props: [[1, 0.29, 0.23, 165], [0, 0.31, 0.26, 85], [5, 0.7, 0.24, 155], [2, 0.22, 0.49, 130], [2, 0.76, 0.51, 130], [1, 0.31, 0.81, 175], [0, 0.65, 0.82, 85], [4, 0.5, 0.4, 70, true]], lights: [[0.24, 0.21, 0.33, 0.2, 0.018], [0.7, 0.35, 0.74, 0.41, 0.018], [0.26, 0.72, 0.34, 0.73, 0.014]] },
  war: { props: [[1, 0.25, 0.2, 250], [0, 0.23, 0.24, 125], [2, 0.13, 0.49, 190], [2, 0.88, 0.52, 190], [5, 0.75, 0.79, 195], [1, 0.28, 0.8, 230]], lights: [[0.23, 0.18, 0.34, 0.14, 0.022], [0.66, 0.14, 0.77, 0.18, 0.022]] },
  arena: { props: [[2, 0.17, 0.24, 165], [2, 0.83, 0.24, 165], [1, 0.15, 0.8, 190], [5, 0.85, 0.8, 170], [0, 0.17, 0.84, 85], [4, 0.5, 0.12, 75, true]], lights: [[0.3, 0.14, 0.42, 0.11, 0.02], [0.58, 0.11, 0.7, 0.14, 0.02]] }
,"ancient":{"props":[[1,0.16,0.2,185],[2,0.65,0.2,175],[5,0.83,0.4,180],[2,0.2,0.57,180],[1,0.48,0.78,170],[0,0.8,0.84,90]],"lights":[[0.1,0.15,0.22,0.16,0.016],[0.78,0.32,0.89,0.35,0.015]]},"afk":{"props":[[1,0.25,0.22,170],[2,0.59,0.15,175],[5,0.82,0.31,165],[2,0.23,0.5,160],[1,0.76,0.69,170],[0,0.42,0.73,90]],"lights":[[0.22,0.16,0.32,0.14,0.015],[0.65,0.75,0.76,0.77,0.014]]},"dragon":{"props":[[1,0.27,0.22,185],[2,0.72,0.23,185],[5,0.16,0.47,175],[2,0.84,0.47,175],[1,0.32,0.66,180],[0,0.69,0.66,90]],"lights":[[0.23,0.19,0.35,0.15,0.018],[0.65,0.15,0.77,0.19,0.018]]},"event":{"props":[[1,0.27,0.2,175],[2,0.61,0.17,165],[5,0.82,0.29,170],[2,0.83,0.64,175],[1,0.33,0.76,170],[0,0.17,0.47,90]],"lights":[[0.23,0.14,0.35,0.14,0.016],[0.7,0.78,0.81,0.74,0.016]]},"rune":{"props":[[1,0.39,0.24,185],[2,0.66,0.28,180],[5,0.32,0.43,175],[2,0.66,0.58,180],[1,0.35,0.7,175],[0,0.65,0.82,90]],"lights":[[0.35,0.22,0.43,0.18,0.014],[0.7,0.52,0.78,0.49,0.015]]}};
var harvest = {
  bazaar: { props: [[5, 0.17, 0.4, 160], [0, 0.19, 0.43, 90], [1, 0.3, 0.31, 180], [4, 0.8, 0.28, 180], [3, 0.83, 0.71, 125], [0, 0.73, 0.83, 90], [2, 0.14, 0.73, 160], [0, 0.39, 0.16, 85], [0, 0.61, 0.15, 75]], lights: [[0.35, 0.12, 0.54, 0.12, 0.035], [0.8, 0.2, 0.91, 0.29, 0.035]] },
  forest: { props: [[1, 0.34, 0.34, 255], [0, 0.32, 0.37, 115], [2, 0.62, 0.31, 220], [4, 0.22, 0.22, 225], [3, 0.23, 0.59, 145], [0, 0.65, 0.64, 125], [2, 0.79, 0.45, 220], [1, 0.41, 0.79, 225], [5, 0.7, 0.81, 230], [0, 0.73, 0.82, 110]], lights: [[0.27, 0.14, 0.37, 0.19, 0.03], [0.6, 0.25, 0.68, 0.26, 0.026], [0.63, 0.72, 0.72, 0.76, 0.025]] },
  frozen: { props: [[2, 0.36, 0.35, 220], [0, 0.38, 0.38, 115], [1, 0.59, 0.36, 245], [4, 0.22, 0.51, 225], [3, 0.64, 0.71, 160], [2, 0.81, 0.55, 225], [0, 0.41, 0.85, 125], [5, 0.23, 0.77, 210]], lights: [[0.25, 0.16, 0.34, 0.18, 0.025], [0.59, 0.64, 0.67, 0.67, 0.025]] },
  black: { props: [[2, 0.16, 0.27, 235], [1, 0.82, 0.32, 240], [5, 0.24, 0.73, 225], [0, 0.27, 0.75, 125], [3, 0.77, 0.77, 165], [4, 0.36, 0.15, 230], [2, 0.66, 0.87, 235], [0, 0.88, 0.49, 120]], lights: [[0.43, 0.08, 0.56, 0.08, 0.022], [0.77, 0.77, 0.85, 0.71, 0.026]] },
  fishing: { props: [[4, 0.24, 0.27, 170], [0, 0.21, 0.3, 80], [3, 0.11, 0.6, 110], [1, 0.88, 0.61, 180], [0, 0.3, 0.84, 80], [5, 0.72, 0.86, 125]], lights: [[0.11, 0.4, 0.17, 0.3, 0.024], [0.83, 0.38, 0.9, 0.47, 0.02]] },
  sanctum: { props: [[2, 0.32, 0.28, 180], [2, 0.69, 0.29, 180], [0, 0.37, 0.21, 75], [0, 0.63, 0.2, 75], [3, 0.25, 0.52, 110], [3, 0.75, 0.51, 110], [4, 0.34, 0.72, 160]], lights: [[0.29, 0.32, 0.36, 0.23, 0.02], [0.64, 0.23, 0.72, 0.33, 0.02]] },
  sinsi: { props: [[1, 0.3, 0.27, 175], [0, 0.33, 0.28, 75], [2, 0.7, 0.24, 150], [3, 0.24, 0.53, 100], [4, 0.58, 0.46, 150], [5, 0.34, 0.82, 150], [0, 0.67, 0.81, 80]], lights: [[0.19, 0.42, 0.25, 0.48, 0.022], [0.6, 0.73, 0.69, 0.71, 0.02]] },
  war: { props: [[1, 0.27, 0.22, 235], [1, 0.75, 0.24, 225], [0, 0.24, 0.26, 105], [3, 0.13, 0.58, 140], [2, 0.86, 0.62, 205], [5, 0.69, 0.84, 205]], lights: [[0.2, 0.26, 0.27, 0.19, 0.025], [0.71, 0.17, 0.81, 0.23, 0.025]] },
  arena: { props: [[2, 0.16, 0.25, 165], [2, 0.84, 0.25, 165], [0, 0.19, 0.82, 90], [0, 0.81, 0.82, 90], [1, 0.27, 0.16, 170], [1, 0.73, 0.16, 170]], lights: [[0.33, 0.13, 0.45, 0.11, 0.02], [0.55, 0.11, 0.67, 0.13, 0.02]] }
,"ancient":{"props":[[1,0.16,0.2,185],[2,0.65,0.2,175],[4,0.83,0.4,180],[3,0.2,0.57,180],[5,0.48,0.78,170],[0,0.8,0.84,90]],"lights":[[0.1,0.15,0.22,0.16,0.016],[0.78,0.32,0.89,0.35,0.015]]},"afk":{"props":[[1,0.25,0.22,170],[2,0.59,0.15,175],[4,0.82,0.31,165],[3,0.23,0.5,160],[5,0.76,0.69,170],[0,0.42,0.73,90]],"lights":[[0.22,0.16,0.32,0.14,0.015],[0.65,0.75,0.76,0.77,0.014]]},"dragon":{"props":[[1,0.27,0.22,185],[2,0.72,0.23,185],[4,0.16,0.47,175],[3,0.84,0.47,175],[5,0.32,0.66,180],[0,0.69,0.66,90]],"lights":[[0.23,0.19,0.35,0.15,0.018],[0.65,0.15,0.77,0.19,0.018]]},"event":{"props":[[1,0.27,0.2,175],[2,0.61,0.17,165],[4,0.82,0.29,170],[3,0.83,0.64,175],[5,0.33,0.76,170],[0,0.17,0.47,90]],"lights":[[0.23,0.14,0.35,0.14,0.016],[0.7,0.78,0.81,0.74,0.016]]},"rune":{"props":[[1,0.39,0.24,185],[2,0.66,0.28,180],[4,0.32,0.43,175],[3,0.66,0.58,180],[5,0.35,0.7,175],[0,0.65,0.82,90]],"lights":[[0.35,0.22,0.43,0.18,0.014],[0.7,0.52,0.78,0.49,0.015]]}};
var ramadan = {
  bazaar: { props: [[1, 0.28, 0.28, 230], [5, 0.8, 0.32, 185], [3, 0.2, 0.46, 100], [2, 0.17, 0.44, 80], [0, 0.15, 0.66, 175], [0, 0.86, 0.65, 175], [3, 0.77, 0.79, 100], [4, 0.4, 0.13, 115, true], [4, 0.82, 0.19, 105, true], [0, 0.64, 0.86, 165]], lights: [[0.18, 0.19, 0.3, 0.15, 0.035], [0.37, 0.09, 0.57, 0.1, 0.035], [0.79, 0.19, 0.92, 0.3, 0.038], [0.14, 0.67, 0.22, 0.79, 0.025]] },
  forest: { props: [[0, 0.36, 0.33, 230], [1, 0.2, 0.58, 225], [4, 0.28, 0.21, 155, true], [0, 0.64, 0.34, 225], [4, 0.65, 0.29, 140, true], [0, 0.77, 0.62, 220], [2, 0.39, 0.78, 100], [0, 0.41, 0.79, 220], [1, 0.66, 0.83, 205]], lights: [[0.31, 0.37, 0.39, 0.33, 0.025], [0.62, 0.62, 0.72, 0.63, 0.026], [0.38, 0.81, 0.46, 0.85, 0.025]] },
  frozen: { props: [[0, 0.35, 0.33, 235], [1, 0.59, 0.32, 225], [0, 0.23, 0.58, 220], [4, 0.52, 0.18, 145, true], [0, 0.66, 0.68, 235], [4, 0.75, 0.56, 140, true], [1, 0.27, 0.8, 210], [2, 0.4, 0.86, 95]], lights: [[0.24, 0.18, 0.34, 0.16, 0.025], [0.64, 0.64, 0.73, 0.68, 0.025]] },
  black: { props: [[5, 0.24, 0.23, 235], [3, 0.26, 0.29, 140], [2, 0.22, 0.29, 105], [1, 0.65, 0.15, 260], [0, 0.16, 0.65, 245], [0, 0.82, 0.68, 245], [4, 0.48, 0.1, 185, true], [1, 0.32, 0.85, 235], [4, 0.83, 0.27, 150, true]], lights: [[0.12, 0.17, 0.24, 0.14, 0.026], [0.45, 0.075, 0.56, 0.075, 0.024], [0.79, 0.17, 0.9, 0.25, 0.027], [0.73, 0.81, 0.84, 0.74, 0.025]] },
  fishing: { props: [[0, 0.23, 0.24, 170], [4, 0.28, 0.18, 100, true], [3, 0.13, 0.57, 85], [0, 0.88, 0.58, 160], [1, 0.72, 0.85, 165], [2, 0.29, 0.85, 70], [0, 0.34, 0.91, 150]], lights: [[0.12, 0.39, 0.17, 0.29, 0.024], [0.82, 0.28, 0.89, 0.39, 0.024], [0.63, 0.91, 0.72, 0.87, 0.018]] },
  sanctum: { props: [[1, 0.34, 0.25, 175], [1, 0.66, 0.25, 175], [0, 0.24, 0.48, 165], [0, 0.76, 0.48, 165], [4, 0.48, 0.15, 110, true], [0, 0.35, 0.72, 150], [0, 0.65, 0.72, 150]], lights: [[0.31, 0.26, 0.38, 0.19, 0.018], [0.62, 0.19, 0.7, 0.25, 0.018]] },
  sinsi: { props: [[1, 0.29, 0.26, 180], [4, 0.33, 0.2, 100, true], [0, 0.7, 0.24, 160], [0, 0.23, 0.5, 150], [0, 0.75, 0.53, 150], [3, 0.34, 0.8, 85], [2, 0.36, 0.83, 70], [1, 0.66, 0.79, 165]], lights: [[0.25, 0.21, 0.35, 0.19, 0.024], [0.59, 0.42, 0.67, 0.37, 0.022], [0.27, 0.72, 0.35, 0.74, 0.02]] },
  war: { props: [[1, 0.28, 0.23, 230], [1, 0.73, 0.22, 230], [0, 0.12, 0.53, 220], [0, 0.88, 0.53, 220], [0, 0.32, 0.82, 205], [0, 0.69, 0.82, 205]], lights: [[0.22, 0.2, 0.33, 0.14, 0.025], [0.67, 0.14, 0.78, 0.2, 0.025]] },
  arena: { props: [[0, 0.16, 0.27, 180], [0, 0.84, 0.27, 180], [1, 0.28, 0.16, 185], [1, 0.72, 0.16, 185], [0, 0.16, 0.82, 170], [0, 0.84, 0.82, 170]], lights: [[0.34, 0.13, 0.44, 0.11, 0.018], [0.56, 0.11, 0.66, 0.13, 0.018]] }
,"ancient":{"props":[[0,0.16,0.2,185],[1,0.65,0.2,175],[0,0.83,0.4,180],[1,0.2,0.57,180],[0,0.48,0.78,170],[2,0.8,0.84,90]],"lights":[[0.1,0.15,0.22,0.16,0.016],[0.78,0.32,0.89,0.35,0.015]]},"afk":{"props":[[0,0.25,0.22,170],[1,0.59,0.15,175],[0,0.82,0.31,165],[1,0.23,0.5,160],[0,0.76,0.69,170],[2,0.42,0.73,90]],"lights":[[0.22,0.16,0.32,0.14,0.015],[0.65,0.75,0.76,0.77,0.014]]},"dragon":{"props":[[0,0.27,0.22,185],[1,0.72,0.23,185],[0,0.16,0.47,175],[1,0.84,0.47,175],[0,0.32,0.66,180],[2,0.69,0.66,90]],"lights":[[0.23,0.19,0.35,0.15,0.018],[0.65,0.15,0.77,0.19,0.018]]},"event":{"props":[[0,0.27,0.2,175],[1,0.61,0.17,165],[0,0.82,0.29,170],[1,0.83,0.64,175],[0,0.33,0.76,170],[2,0.17,0.47,90]],"lights":[[0.23,0.14,0.35,0.14,0.016],[0.7,0.78,0.81,0.74,0.016]]},"rune":{"props":[[0,0.39,0.24,185],[1,0.66,0.28,180],[0,0.32,0.43,175],[1,0.66,0.58,180],[0,0.35,0.7,175],[2,0.65,0.82,90]],"lights":[[0.35,0.22,0.43,0.18,0.014],[0.7,0.52,0.78,0.49,0.015]]}};
var firstLight = {
  bazaar: { props: [[0, 0.28, 0.27, 260], [2, 0.24, 0.32, 85], [1, 0.35, 0.29, 185], [3, 0.7, 0.28, 235], [5, 0.72, 0.78, 160], [2, 0.75, 0.83, 85], [1, 0.15, 0.65, 190], [1, 0.85, 0.65, 190], [4, 0.42, 0.14, 115, true], [4, 0.8, 0.18, 105, true], [5, 0.27, 0.78, 145]], lights: [[0.15, 0.19, 0.3, 0.13, 0.027], [0.36, 0.09, 0.6, 0.09, 0.03], [0.78, 0.15, 0.92, 0.26, 0.026], [0.67, 0.91, 0.82, 0.85, 0.025]] },
  forest: { props: [[0, 0.35, 0.35, 290], [2, 0.33, 0.38, 100], [1, 0.63, 0.34, 250], [5, 0.66, 0.61, 215], [4, 0.26, 0.2, 160, true], [3, 0.71, 0.81, 290], [1, 0.39, 0.76, 240], [2, 0.22, 0.59, 105], [5, 0.78, 0.45, 190], [4, 0.65, 0.27, 150, true]], lights: [[0.28, 0.15, 0.38, 0.19, 0.024], [0.61, 0.25, 0.69, 0.27, 0.025], [0.65, 0.72, 0.72, 0.77, 0.024]] },
  frozen: { props: [[0, 0.35, 0.34, 290], [5, 0.6, 0.32, 200], [1, 0.27, 0.59, 255], [4, 0.54, 0.19, 155, true], [3, 0.68, 0.7, 285], [2, 0.65, 0.74, 100], [1, 0.82, 0.58, 255], [5, 0.27, 0.81, 200], [2, 0.43, 0.85, 100]], lights: [[0.25, 0.18, 0.35, 0.16, 0.025], [0.64, 0.64, 0.73, 0.68, 0.025], [0.4, 0.79, 0.45, 0.82, 0.018]] },
  black: { props: [[3, 0.28, 0.22, 310], [1, 0.19, 0.31, 270], [0, 0.65, 0.16, 310], [2, 0.62, 0.2, 115], [5, 0.22, 0.73, 220], [1, 0.82, 0.66, 270], [4, 0.48, 0.1, 185, true], [5, 0.68, 0.84, 215], [2, 0.87, 0.51, 110]], lights: [[0.12, 0.17, 0.25, 0.14, 0.027], [0.44, 0.07, 0.56, 0.07, 0.025], [0.79, 0.17, 0.9, 0.25, 0.025]] },
  fishing: { props: [[5, 0.25, 0.26, 160], [1, 0.11, 0.51, 175], [2, 0.12, 0.59, 80], [0, 0.72, 0.84, 205], [4, 0.76, 0.19, 105, true], [1, 0.89, 0.56, 175], [2, 0.31, 0.87, 80]], lights: [[0.13, 0.39, 0.18, 0.29, 0.02], [0.81, 0.29, 0.89, 0.4, 0.02], [0.63, 0.92, 0.73, 0.87, 0.02]] },
  sanctum: { props: [[0, 0.33, 0.27, 210], [0, 0.67, 0.27, 210], [1, 0.23, 0.48, 180], [1, 0.77, 0.48, 180], [5, 0.34, 0.7, 140], [5, 0.66, 0.7, 140], [4, 0.5, 0.15, 115, true], [2, 0.39, 0.21, 70], [2, 0.62, 0.21, 70]], lights: [[0.3, 0.28, 0.38, 0.19, 0.018], [0.62, 0.19, 0.71, 0.28, 0.018]] },
  sinsi: { props: [[0, 0.29, 0.26, 200], [5, 0.7, 0.25, 145], [1, 0.22, 0.5, 175], [1, 0.76, 0.52, 175], [4, 0.49, 0.41, 110, true], [3, 0.33, 0.82, 195], [2, 0.65, 0.83, 80]], lights: [[0.24, 0.21, 0.34, 0.19, 0.02], [0.61, 0.43, 0.68, 0.37, 0.02], [0.29, 0.74, 0.37, 0.77, 0.02]] },
  war: { props: [[0, 0.27, 0.22, 285], [3, 0.72, 0.23, 270], [1, 0.12, 0.52, 235], [1, 0.88, 0.52, 235], [5, 0.32, 0.82, 200], [5, 0.68, 0.82, 200], [2, 0.25, 0.26, 105]], lights: [[0.23, 0.19, 0.34, 0.14, 0.025], [0.66, 0.14, 0.77, 0.2, 0.025]] },
  arena: { props: [[1, 0.16, 0.26, 190], [1, 0.84, 0.26, 190], [0, 0.29, 0.16, 205], [0, 0.71, 0.16, 205], [2, 0.17, 0.83, 80], [2, 0.83, 0.83, 80], [4, 0.5, 0.11, 95, true]], lights: [[0.33, 0.13, 0.44, 0.11, 0.018], [0.56, 0.11, 0.67, 0.13, 0.018]] }
,"ancient":{"props":[[0,0.16,0.2,185],[1,0.65,0.2,175],[5,0.83,0.4,180],[1,0.2,0.57,180],[0,0.48,0.78,170],[2,0.8,0.84,90]],"lights":[[0.1,0.15,0.22,0.16,0.016],[0.78,0.32,0.89,0.35,0.015]]},"afk":{"props":[[0,0.25,0.22,170],[1,0.59,0.15,175],[5,0.82,0.31,165],[1,0.23,0.5,160],[0,0.76,0.69,170],[2,0.42,0.73,90]],"lights":[[0.22,0.16,0.32,0.14,0.015],[0.65,0.75,0.76,0.77,0.014]]},"dragon":{"props":[[0,0.27,0.22,185],[1,0.72,0.23,185],[5,0.16,0.47,175],[1,0.84,0.47,175],[0,0.32,0.66,180],[2,0.69,0.66,90]],"lights":[[0.23,0.19,0.35,0.15,0.018],[0.65,0.15,0.77,0.19,0.018]]},"event":{"props":[[0,0.27,0.2,175],[1,0.61,0.17,165],[5,0.82,0.29,170],[1,0.83,0.64,175],[0,0.33,0.76,170],[2,0.17,0.47,90]],"lights":[[0.23,0.14,0.35,0.14,0.016],[0.7,0.78,0.81,0.74,0.016]]},"rune":{"props":[[0,0.39,0.24,185],[1,0.66,0.28,180],[5,0.32,0.43,175],[1,0.66,0.58,180],[0,0.35,0.7,175],[2,0.65,0.82,90]],"lights":[[0.35,0.22,0.43,0.18,0.014],[0.7,0.52,0.78,0.49,0.015]]}};
winter.guild_arena = { props: [[1, 0.15, 0.17, 185], [5, 0.85, 0.18, 170], [0, 0.21, 0.85, 90], [2, 0.8, 0.87, 170], [4, 0.36, 0.09, 80, true], [4, 0.66, 0.09, 80, true]], lights: [[0.22, 0.08, 0.39, 0.08, 0.017], [0.59, 0.08, 0.76, 0.08, 0.017], [0.24, 0.89, 0.42, 0.9, 0.013]] };
harvest.guild_arena = { props: [[2, 0.15, 0.2, 170], [2, 0.85, 0.2, 170], [0, 0.25, 0.85, 85], [0, 0.75, 0.85, 85], [1, 0.38, 0.1, 145], [1, 0.62, 0.1, 145]], lights: [[0.22, 0.085, 0.39, 0.085, 0.019], [0.61, 0.085, 0.78, 0.085, 0.019]] };
ramadan.guild_arena = { props: [[0, 0.15, 0.21, 180], [0, 0.85, 0.21, 180], [1, 0.26, 0.86, 150], [1, 0.74, 0.86, 150], [4, 0.38, 0.09, 90, true], [4, 0.62, 0.09, 90, true]], lights: [[0.22, 0.085, 0.4, 0.085, 0.019], [0.6, 0.085, 0.78, 0.085, 0.019]] };
firstLight.guild_arena = { props: [[0, 0.16, 0.19, 190], [0, 0.84, 0.19, 190], [1, 0.24, 0.87, 170], [1, 0.76, 0.87, 170], [4, 0.38, 0.09, 95, true], [4, 0.64, 0.09, 95, true], [2, 0.42, 0.89, 80], [2, 0.58, 0.89, 80]], lights: [[0.22, 0.085, 0.4, 0.085, 0.017], [0.6, 0.085, 0.78, 0.085, 0.017]] };
var FESTIVAL_LAYOUTS = { new_year: winter, halloween: harvest, ramadan, first_light: firstLight };
function festivalLayout(theme, area) {
  return FESTIVAL_LAYOUTS[theme]?.[area];
}

// lib/seasonal-atlas-bounds453.mjs
var SEASONAL_ATLAS_BOUNDS453 = {
  "new_year": [
    [
      54,
      110,
      417,
      382
    ],
    [
      590,
      12,
      382,
      500
    ],
    [
      1175,
      10,
      335,
      493
    ],
    [
      25,
      512,
      475,
      475
    ],
    [
      524,
      605,
      535,
      298
    ],
    [
      1100,
      493,
      390,
      520
    ]
  ],
  "halloween": [
    [
      39,
      119,
      450,
      380
    ],
    [
      565,
      7,
      411,
      503
    ],
    [
      1156,
      23,
      269,
      482
    ],
    [
      34,
      560,
      459,
      408
    ],
    [
      526,
      523,
      485,
      452
    ],
    [
      1066,
      536,
      448,
      437
    ]
  ],
  "ramadan": [
    [
      140,
      0,
      248,
      545
    ],
    [
      554,
      16,
      427,
      530
    ],
    [
      1080,
      133,
      390,
      403
    ],
    [
      8,
      560,
      503,
      453
    ],
    [
      514,
      557,
      527,
      396
    ],
    [
      1070,
      528,
      460,
      480
    ]
  ],
  "first_light": [
    [
      95,
      7,
      366,
      502
    ],
    [
      658,
      0,
      225,
      530
    ],
    [
      1072,
      92,
      415,
      410
    ],
    [
      62,
      518,
      439,
      482
    ],
    [
      524,
      512,
      500,
      409
    ],
    [
      1110,
      527,
      395,
      480
    ]
  ]
};

// lib/seasonal-extra-bounds453.mjs
var SEASONAL_EXTRA_BOUNDS453 = [[49, 9, 321, 379], [400, 104, 402, 274], [895, 3, 149, 411], [69, 389, 319, 367], [461, 386, 248, 372], [789, 422, 347, 334]];

// lib/seasonal-decor.mjs
var labels = {
  new_year: ["K\u0131zak", "I\u015F\u0131kl\u0131 \xC7am", "\xC7an Dire\u011Fi", "K\u0131\u015F Tezg\xE2h\u0131", "\xC7am Girland\u0131", "Buz Geyi\u011Fi", "Kardan Adam", "Hediye Y\u0131\u011F\u0131n\u0131", "F\u0131nd\u0131kk\u0131ran", "\xC7elenk Dire\u011Fi", "K\u0131\u015F Feneri", "Mum K\xF6\u015Fesi"],
  halloween: ["Balkaba\u011F\u0131 K\xFCmesi", "Korkuluk", "Kuzgun Heykeli", "Cad\u0131 Kazan\u0131", "Fenerli Ge\xE7it", "Hasat Arabas\u0131"],
  ramadan: ["Fanus Dire\u011Fi", "Hilal", "Davul", "\u0130ftar Masas\u0131", "As\u0131l\u0131 Fanus", "T\xF6ren \xC7ad\u0131r\u0131"],
  first_light: ["\xC7ekirdek Feneri", "T\xF6ren Sanca\u011F\u0131", "Mum K\xFCmesi", "T\xF6ren Kemeri", "Prizma Girland\u0131", "Fidan Havuzu"]
};
var sizes = { new_year: [120, 250, 165, 160, 85, 180, 165, 100, 200, 180, 150, 90], halloween: [90, 180, 160, 125, 180, 160], ramadan: [175, 230, 80, 100, 105, 185], first_light: [260, 185, 85, 235, 105, 160] };
var catalog = Object.freeze(Object.fromEntries(Object.entries(labels).map(([theme, names]) => [theme, Object.freeze(names.map((label, kind) => Object.freeze({ kind, label, name: label, size: sizes[theme][kind], wall: kind === 4 })))])));
var lastText;
var lastParsed = {};
function seasonalSettings453(settings) {
  const text = settings?.seasonal_themes_json ?? "{}";
  if (text !== lastText) {
    lastText = text;
    try {
      const parsed = JSON.parse(text);
      lastParsed = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      lastParsed = {};
    }
  }
  return lastParsed;
}
function seasonalTheme453(settings, area, inDungeon = false) {
  if (inDungeon || !festivalLayout("new_year", area)) return "none";
  const map = seasonalSettings453(settings), key = area === "guild_arena" ? "arena" : area;
  if (Object.hasOwn(map, key) && ["none", "new_year", "halloween", "ramadan", "first_light"].includes(map[key])) return map[key];
  return Number(settings?.new_year_mode) === 1 ? "new_year" : Number(settings?.halloween_mode) === 1 ? "halloween" : "none";
}

// lib/seasonal-renderer453.mjs
var SEASONAL_LIMITS453 = Object.freeze({ props: 32, lights: 8, spriteSide: 320, stripSide: 640, stripEntries: 24, stripPixels: 1048576, sceneEntries: 2 });
var palettes = {
  new_year: { rgb: "255,208,128", accent: "#e8edda", particle: "#eaf2f4" },
  halloween: { rgb: "237,151,62", accent: "#acb794", particle: "#c9c9ad" },
  ramadan: { rgb: "255,210,139", accent: "#8cbeb2", particle: "#eddbaf" },
  first_light: { rgb: "127,222,167", accent: "#ead59e", particle: "#e5d8a5" }
};
var imageRecords = /* @__PURE__ */ new WeakMap();
var layoutAliases = /* @__PURE__ */ new WeakMap();
var halos = /* @__PURE__ */ new Map();
var strips = /* @__PURE__ */ new Map();
var assetOwners = /* @__PURE__ */ new WeakMap();
var stripPixels = 0;
var canvas = () => typeof document !== "undefined" ? document.createElement("canvas") : null;
var validImage = (image) => !!image?.complete && Number(image.naturalWidth) > 0 && Number(image.naturalHeight) > 0;
var num = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
var array = (value) => Array.isArray(value) ? value : [];
var themeKey = (theme) => Object.hasOwn(palettes, theme) ? theme : "none";
var wrap = (n, max) => (n % max + max) % max;
var keyFor = (o, layout) => `${o.theme}:${o.area}:${o.width}:${o.height}:${layout.custom ? "custom" : "default"}:${layout.props.map((p) => p.join(",")).join(";")}/${layout.lights.map((p) => p.join(",")).join(";")}`;
const SEASONAL_HALLOWEEN_EXTRA_BOUNDS469 = [[0,0,512,512],[548,0,464,512],[1032,0,496,512],[32,520,510,490],[542,540,490,450],[1108,512,356,512]];
function boundedSeasonalLayout453(theme, area, value) {
  const count = (theme === "new_year" || theme === "halloween") ? 12 : SEASONAL_ATLAS_BOUNDS453[theme]?.length ?? 0;
  const input = value && value.custom !== false && typeof value === "object" && Array.isArray(value.props) && Array.isArray(value.lights) && (!value.theme || value.theme === theme) && (!value.area || value.area === area) ? value : festivalLayout(theme, area);
  if (!input) return null;
  const props = [], lights = [];
  for (const p of array(input.props).slice(0, 32)) {
    if (!Array.isArray(p) || !Number.isInteger(p[0]) || p[0] < 0 || p[0] >= count || !num(p[1], 0, 1) || !num(p[2], 0, 1) || !num(p[3], 60, 320)) continue;
    props.push([p[0], p[1], p[2], p[3], p[4] === true]);
  }
  for (const p of array(input.lights).slice(0, 8)) {
    if (!Array.isArray(p) || p.length < 5 || !p.slice(0, 4).every((n) => num(n, 0, 1)) || !num(p[4], 0, 0.08)) continue;
    lights.push(p.slice(0, 5));
  }
  return { props, lights, custom: input === value && value?.custom !== false };
}
function halo(theme) {
  let cached = halos.get(theme);
  if (cached) return cached;
  const c = canvas();
  if (!c) return null;
  c.width = c.height = 96;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(48, 48, 1, 48, 48, 48), rgb = palettes[theme].rgb;
  g.addColorStop(0, `rgba(${rgb},.40)`);
  g.addColorStop(0.35, `rgba(${rgb},.14)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 96, 96);
  halos.set(theme, c);
  return c;
}
function makeSprite(image, theme, index, extra = false) {
  const bounds = extra ? (theme === "halloween" ? SEASONAL_HALLOWEEN_EXTRA_BOUNDS469 : SEASONAL_EXTRA_BOUNDS453)[index] : SEASONAL_ATLAS_BOUNDS453[theme]?.[index];
  if (!bounds) return null;
  const [left, top, width, height] = bounds;
  if (!(width > 0 && height > 0 && left >= 0 && top >= 0 && left + width <= image.naturalWidth && top + height <= image.naturalHeight)) return null;
  const c = canvas();
  if (!c) return null;
  const scale = Math.min(1, 320 / Math.max(width, height));
  c.width = Math.ceil(width * scale);
  c.height = Math.ceil(height * scale);
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(image, left, top, width, height, 0, 0, c.width, c.height);
  return c;
}
function lightStrip(theme, points, width, height, custom = false) {
  const key = `${theme}:${width}:${height}:${custom ? "custom:" : ""}${points.join(",")}`;
  let cached = strips.get(key);
  if (cached) {
    strips.delete(key);
    strips.set(key, cached);
    return cached;
  }
  const [ax, ay, bx, by, sag] = points, x1 = ax * width, y1 = ay * height, x2 = bx * width, y2 = by * height, drop = sag * height;
  const left = Math.min(x1, x2) - 14, top = Math.min(y1, y2) - 14, w = Math.abs(x2 - x1) + 28, h = Math.abs(y2 - y1) + drop + 45;
  const scale = Math.min(1, 640 / Math.max(w, h), custom ? Math.sqrt(65536 / (w * h)) : 1), c = canvas();
  if (!c) return null;
  c.width = Math.ceil(w * scale);
  c.height = Math.ceil(h * scale);
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const glow = halo(theme);
  if (!glow) return null;
  ctx.scale(scale, scale);
  ctx.translate(-left, -top);
  ctx.strokeStyle = theme === "new_year" ? "#344138" : "#67573f";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + drop * 2, x2, y2);
  ctx.stroke();
  const count = Math.min(18, Math.max(6, Math.round(Math.hypot(x2 - x1, y2 - y1) / (theme === "new_year" ? 27 : 60))));
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1), x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t + 4 * drop * t * (1 - t), fanous = theme === "ramadan", size = fanous ? 6 : theme === "new_year" ? 2.8 : 4;
    ctx.drawImage(glow, x - 13, y - 8, 26, 26);
    ctx.fillStyle = i % 3 === 0 ? palettes[theme].accent : "#f0d3a0";
    if (fanous) {
      ctx.strokeStyle = "#a08650";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 5);
      ctx.stroke();
      ctx.fillRect(x - size / 2, y + 5, size, size * 1.3);
    } else {
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  cached = { canvas: c, key, left, top, width: w, height: h, pixels: c.width * c.height };
  strips.set(key, cached);
  stripPixels += cached.pixels;
  while (strips.size > 24 || stripPixels > 1048576) {
    const oldest = strips.keys().next().value, item = strips.get(oldest);
    strips.delete(oldest);
    stripPixels -= item.pixels;
  }
  return cached;
}
function recordsFor(image) {
  let record = imageRecords.get(image);
  if (!record) {
    record = { art: /* @__PURE__ */ new Map(), scenes: /* @__PURE__ */ new Map() };
    imageRecords.set(image, record);
  }
  return record;
}
function sceneStart(o) {
  const theme = themeKey(o.theme);
  if (theme === "none" || !validImage(o.image) || !num(o.width, 1, 2e4) || !num(o.height, 1, 2e4)) return null;
  const layout = boundedSeasonalLayout453(theme, o.area, o.layout);
  if (!layout) return null;
  const needExtra = (theme === "new_year" || theme === "halloween") && layout.props.some((p) => p[0] >= 6);
  if (needExtra && !validImage(o.extraImage)) return null;
  const key = keyFor(o, layout), record = recordsFor(o.image), cached = record.scenes.get(key);
  if (cached && cached.lights.every((l) => strips.has(l.key))) {
    if (o.layout && typeof o.layout === "object") layoutAliases.set(o.layout, cached);
    record.active = cached;
    return { cached };
  }
  const base = record.art.get(theme) ?? [];
  record.art.set(theme, base);
  const extraRecord = needExtra ? recordsFor(o.extraImage) : null, extra = extraRecord ? extraRecord.art.get(theme === "halloween" ? "halloweenExtra469" : "extra") ?? [] : [];
  if (extraRecord) extraRecord.art.set(theme === "halloween" ? "halloweenExtra469" : "extra", extra);
  const art = [];
  const scene = { theme, area: o.area, width: o.width, height: o.height, key, layout, art, lights: [], glow: null, ready: false };
  const jobs = [];
  for (let i = 0; i < SEASONAL_ATLAS_BOUNDS453[theme].length; i++) jobs.push(() => {
    if (!base[i]) base[i] = makeSprite(o.image, theme, i);
    art[i] = base[i];
  });
  if (needExtra) for (let i = 0; i < 6; i++) jobs.push(() => {
    if (!extra[i]) extra[i] = makeSprite(o.extraImage, theme, i, true);
    art[6 + i] = extra[i];
  });
  jobs.push(() => {
    scene.glow = halo(theme);
  });
  for (const points of layout.lights) jobs.push(() => {
    const strip = lightStrip(theme, points, o.width, o.height, layout.custom);
    if (strip) {
      const { key: key2, left, top, width, height } = strip;
      scene.lights.push({ key: key2, left, top, width, height, x1: points[0] });
    }
  });
  const finish = () => {
    scene.ready = !!scene.glow && scene.art.length === (needExtra ? 12 : 6) && scene.art.every(Boolean);
    if (!scene.ready) return;
    record.scenes.set(key, scene);
    while (record.scenes.size > 2) record.scenes.delete(record.scenes.keys().next().value);
    record.active = scene;
    if (o.layout && typeof o.layout === "object") layoutAliases.set(o.layout, scene);
  };
  return { scene, jobs, finish };
}
function prepareSeasonalScene453(o) {
  const work = sceneStart(o);
  if (!work) return null;
  if (work.cached) return work.cached;
  for (const job of work.jobs) job();
  work.finish();
  return work.scene.ready ? work.scene : null;
}
function scheduleSeasonalScene453(o, { schedule, cancel, owner } = {}) {
  const work = sceneStart(o);
  if (!work || work.cached) return () => {
  };
  const idle = typeof requestIdleCallback === "function", enqueue = schedule ?? (idle ? ((fn) => requestIdleCallback(fn, { timeout: 1e3 })) : ((fn) => setTimeout(() => fn({ timeRemaining: () => 2 }), 0))), stop = cancel ?? (idle ? cancelIdleCallback : clearTimeout);
  let active = true, id = null, index = 0;
  const cleanup = () => {
    active = false;
    if (id !== null) {
      stop(id);
      id = null;
    }
    if (owner?.pending === cleanup) owner.pending = null;
  };
  const step = (deadline) => {
    id = null;
    if (!active) return;
    let count = 0;
    while (index < work.jobs.length && count < 2 && (count === 0 || deadline.timeRemaining() > 1)) {
      work.jobs[index++]();
      count++;
    }
    if (index < work.jobs.length) id = enqueue(step);
    else {
      work.finish();
      active = false;
      if (owner?.pending === cleanup) owner.pending = null;
    }
  };
  id = enqueue(step);
  if (owner) {
    owner.pending?.();
    owner.pending = cleanup;
  }
  return cleanup;
}
function seasonalParticleBudget453(o) {switch(o.area){case "ancient":case "afk":case "dragon":case "event":case "rune":return 0;}
  return o.still ? 0 : o.heat ? 8 : o.reduced ? 16 : 28;
}
function drawSeasonalScene453(ctx, o, actors) {
  const theme = themeKey(o.theme);
  if (theme === "none" || !validImage(o.image)) return;
  const records = imageRecords.get(o.image);
  if (!records) return;
  const alias = o.layout && typeof o.layout === "object" ? layoutAliases.get(o.layout) : null;
  const scene = alias?.theme === theme && alias?.area === o.area && alias.width === o.width && alias.height === o.height ? alias : records.active;
  if (!scene?.ready || scene.theme !== theme || scene.area !== o.area || scene.width !== o.width || scene.height !== o.height) return;
  const { layout, art, glow } = scene, palette = palettes[theme], time = o.still ? 0 : Math.floor(o.now / (o.heat ? 125 : 80)) * (o.heat ? 125 : 80);
  const left = o.cameraX - o.viewWidth / 2, top = o.cameraY - o.viewHeight / 2, right = left + o.viewWidth, bottom = top + o.viewHeight;
  const visible = (x, y, w, h) => x + w > left && x < right && y + h > top && y < bottom;
  ctx.save();
  try {
    for (const strip of scene.lights) {
      if (!visible(strip.left, strip.top, strip.width, strip.height)) continue;
      const raster = strips.get(strip.key);
      if (!raster) continue;
      ctx.globalAlpha = o.still ? 1 : 0.94 + Math.sin(time / 2400 + strip.x1 * 8) * 0.06;
      ctx.drawImage(raster.canvas, strip.left, strip.top, strip.width, strip.height);
    }
    ctx.globalAlpha = 1;
    for (let index = 0; index < layout.props.length; index++) {
      const [kind, ax, ay, size, wall] = layout.props[index], im = art[kind];
      if (!im) continue;
      const x = ax * o.width, y = ay * o.height, h = size, w = size * im.width / im.height;
      if (!visible(x - w / 2, y - h, w, h + size * 0.18)) continue;
      if (!wall) {
        ctx.globalAlpha = 0.48;
        ctx.drawImage(glow, x - size * 0.4, y - size * 0.12, size * 0.8, size * 0.28);
        ctx.globalAlpha = 1;
      }
      const draw = () => {
        ctx.save();
        ctx.drawImage(im, x - w / 2, y - h, w, h);
        if (kind === (theme === "first_light" ? 0 : theme === "new_year" ? 1 : theme === "ramadan" ? 0 : 3)) {
          ctx.globalAlpha = o.still ? 0.13 : 0.13 + 0.025 * Math.sin(time / 2300 + index);
          ctx.drawImage(glow, x - size * 0.22, y - h * 0.7, size * 0.44, size * 0.38);
        }
        ctx.restore();
      };
      if (wall) draw();
      else actors.push({ y, draw });
    }
    if (!layout.props.length) return;
    const count = seasonalParticleBudget453(o);
    for (let i = 0; i < count; i++) {
      const anchor = layout.props[i % layout.props.length], size = anchor[3];
      const x = anchor[1] * o.width + (wrap(i * 79.17, size * 1.5) - size * 0.75) + Math.sin(time / 3200 + i) * 9;
      const snow = theme === "new_year" && o.area !== "black", rise = wrap(i * 47.11 + time * (snow ? 0.013 : -8e-3), size * 0.8), y = anchor[2] * o.height - size * 0.85 + rise;
      if (!visible(x - 8, y - 8, 16, 16)) continue;
      ctx.globalAlpha = 0.28 + 0.2 * Math.sin(time / 2100 + i) ** 2;
      ctx.fillStyle = palette.particle;
      if (theme === "halloween") ctx.drawImage(glow, x - 16, y - 5, 32, 10);
      else if (theme === "first_light") {
        ctx.beginPath();
        ctx.moveTo(x, y - 3.5);
        ctx.lineTo(x + 1.7, y);
        ctx.lineTo(x, y + 3.5);
        ctx.lineTo(x - 1.7, y);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.ellipse(x, y, snow ? 1.9 : 1.5, snow ? 1.5 : 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } finally {
    ctx.restore();
  }
}
var assetKeys = { new_year: "festival", halloween: "halloween", ramadan: "ramadan", first_light: "firstLight" };
function configureSeasonalAssets453(target, theme, area, width, height, layout) {
  let owner = assetOwners.get(target);
  if (!owner) {
    owner = { pending: null, options: null };
    assetOwners.set(target, owner);
  }
  const descriptor = `${theme}:${area}:${width}:${height}:${layout?.revision ?? 0}:${layout?.custom === true}`;
  if (owner.descriptor === descriptor) {
    const record = imageRecords.get(target[assetKeys[theme]]);
    if (layout && record?.active) layoutAliases.set(layout, record.active);
    return;
  }
  owner.pending?.();
  owner.pending = null;
  owner.descriptor = descriptor;
  owner.options = { theme, area, width, height, layout };
  const key = assetKeys[theme], image = key && target[key];
  if (validImage(image)) scheduleSeasonalScene453({ ...owner.options, image, extraImage: owner.options.theme === "halloween" ? target.halloweenExtra469 : target.festivalExtra453 }, { owner });
}
function acceptSeasonalAsset453(target, key, image) {
  const owner = assetOwners.get(target);
  if (owner?.options && (assetKeys[owner.options.theme] === key || (owner.options.theme === "halloween" ? key === "halloweenExtra469" : key === "festivalExtra453"))) scheduleSeasonalScene453({ ...owner.options, image: target[assetKeys[owner.options.theme]], extraImage: owner.options.theme === "halloween" ? target.halloweenExtra469 : target.festivalExtra453 }, { owner });
}
function disposeSeasonalAssets453(target) {
  const owner = assetOwners.get(target);
  owner?.pending?.();
  assetOwners.delete(target);
}
function seasonalCacheSnapshot453(image) {
  const record = imageRecords.get(image);
  return { sprites: record ? [...record.art.values()].reduce((n, a) => n + a.filter(Boolean).length, 0) : 0, scenes: record?.scenes.size ?? 0, strips: strips.size, stripPixels, halos: halos.size };
}
function seasonalSpriteRatios453(theme) {
  return [...SEASONAL_ATLAS_BOUNDS453[theme] ?? [], ...theme === "new_year" ? SEASONAL_EXTRA_BOUNDS453 : theme === "halloween" ? SEASONAL_HALLOWEEN_EXTRA_BOUNDS469 : []].map(([, , w, h]) => Math.ceil(w * Math.min(1, 320 / Math.max(w, h))) / Math.ceil(h * Math.min(1, 320 / Math.max(w, h))));
}
export {
  SEASONAL_ATLAS_BOUNDS453,
  SEASONAL_LIMITS453,
  acceptSeasonalAsset453,
  boundedSeasonalLayout453,
  configureSeasonalAssets453,
  disposeSeasonalAssets453,
  drawSeasonalScene453,
  prepareSeasonalScene453,
  scheduleSeasonalScene453,
  seasonalCacheSnapshot453,
  seasonalParticleBudget453,
  seasonalSpriteRatios453,
  seasonalTheme453
};

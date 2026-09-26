# V10 캐릭터 아트

- 제작 방식: 내장 ImageGen으로 사용자 참조 이미지의 스타일을 반영한 새 원화 제작.
- 게임 자산: `public/assets/heroes-v10.webp` (809×1942, 투명 RGBA 원본의 WebP 인코딩, 약 1 MB).
- 렌더링: `drawHeroSprite`가 전장, 전체 도감, 재료 썸네일에 동일 원화를 사용합니다.
- 원화 구성: 12종 계열 × 5단계. 실제 게임 T1 소환은 6종만 활성화, T2~T5는 각 12종으로 도감 54종.
- 이미지 로딩 실패 시 기존 Canvas 캐릭터가 대체 표시됩니다.
- 원화는 정적인 3D 스타일 이미지입니다. 실제 3D 모델이나 방향별/프레임별 애니메이션은 아닙니다. 전장에서 부유/공격 반동 효과가 적용됩니다.

## 생성 프롬프트

Create a production game character sprite atlas, using the attached image ONLY as style reference, not as an edit target. Premium polished 3D chibi fantasy miniatures, richer material lighting than reference. TRANSPARENT background. NO text, no frames, no UI, no ground. Exactly 5 columns by 12 rows = 60 full body characters, each centered inside an equal cell, generous transparent gutters. Tall portrait image 1280x3072 or similar 5:12 aspect ratio. Every row is one hero evolving from left to right T1 tiny simple cute novice, T2 modest equipment, T3 detailed rare, T4 legendary elaborate armor, T5 glorious mythic with controlled wings/aura confined in its cell. Consistent 3/4 front facing camera, full body and feet visible. Row 1 silver shield knight gold accents; row 2 purple hooded shadow rogue glowing violet eyes daggers; row 3 stocky white-haired horned barbarian hammer; row 4 green leaf forest tree guardian; row 5 green hooded elven bow archer; row 6 small white-haired musketeer leather hat and flintlock gun; row 7 bronze cannon engineer with compact cannon; row 8 cute cyan fox spirit transforming into regal fox; row 9 orange flame spirit evolving into flame sorceress/phoenix; row 10 blue lightning spirit evolving into storm mage; row 11 pale blue ice spirit evolving into ice queen; row 12 cream gold light spirit evolving into winged angel. Make T1 dramatically simpler than T5. High-end collectible toy/3D mobile RPG character rendering, sharp silhouettes, luminous eyes, detailed metal and cloth. No letters or numbers anywhere. Exactly the uniform 5 by 12 grid with no extra rows, no empty cells.

## 투명 이미지 좌표

생성 결과의 간격이 완전히 균일하지 않아 행과 열 경계를 `atlasX`, `atlasY`에 명시했습니다. 원본 이미지를 잘라 수정하지 않고 Canvas의 원본 영역 지정으로 렌더링합니다.

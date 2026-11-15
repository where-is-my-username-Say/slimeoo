# Slimoo — original character and village repair

## Character source

The construction function and movement/slap/spit animation expressions are extracted directly from D:\downloads\index.html into rpg-original-slime.mjs. The source file remains untouched. The original dome and skirt, dark eyes, blush, seven laurel leaves, fingered hands, outline thickness, toon ramp, mouth and slap timing are retained.

The shared RPG rig adds clothing, job animations, equipment and cosmetic proportions around this source. Meadow players, the live menu preview and villagers use it. Duel/practice fighters also call the original factory and animation function. Wild creatures use the same visual language with species-specific wildlife features and shared hit reactions.

## Character customization

The main menu has a live rotating preview and slap, spit, walk, jump and wave controls. Size, roundness, height, hands, eyes, custom color, laurel, cheeks and equipment visibility can be changed. Original resets the reference proportions. Appearance is cosmetic: combat stats, hitboxes and authoritative movement do not change. Validated appearance is stored with the character and sent in roster/appearance updates; it is not repeated in every world snapshot. Google account summaries include the saved appearance.

## Enterable village

Architecture retains the timber, colored roofs, plaster, signs and shop-specific detailing. Buildings have larger interiors, 4m open doorways (4.4m at the inn), real separate walls, floors and roofs. NPCs and workstations are inside. One layout module determines building transforms, NPC coordinates, collision walls and camera obstacles. Both the client and Worker use these walls. Village terrain is leveled and trees are excluded from the building footprints. The east exit and central plaza stay open.

## Hunting areas

The playable world bounds expand from 136 x 113 to 320 x 190 world-unit radii. Twenty-five named habitats each belong to one species, with separate home positions for its level 1, 5 and 10 residents. Territory rules keep pursuit inside that species' clearing. Spawn selection excludes water and shore margins, paths, the village, the duel ring, obstacles and steep terrain; an obstructed placement is skipped rather than falling back into water. Signs, tree belts, collidable rocks, small themed props and ground colors identify the areas. A numbered atlas lists every species and habitat; the minimap follows the player.

Terrain tiles, rocks, trees and habitat scenery use distance limits so the larger map does not all render at once. Remote terrain uses fewer subdivisions. The binary multiplayer position format remains unchanged; the expanded bounds remain within its range.

## Softer colors and smooth floating UI

Village walls, roofs, floors and paths use muted stone, timber, sage, clay and plum colors. Sun and hemisphere light strength, exposure, sky glare and atmospheric scattering are reduced. Original character construction and camera controls remain intact.

Floating labels previously projected only every 100 milliseconds. Names and health bars now project every rendered frame after refreshing the camera matrix; label decluttering runs separately every 180 milliseconds. Damage numbers use the same current camera matrix. Name text and health-bar widths only change when their values change.

## Interface

The menu is centered on the character preview and direct mode choices. The bag has SVG item illustrations, category filters, equipped markers, quantity badges, empty slots and a persistent details/comparison pane. Supplies and materials have their own relevant actions instead of weapon comparisons.

## Delivery

No tests or browser playtests were run for this pass, as requested. The asset build only copies distribution files and does not prove runtime or visual correctness. Production was not deployed. Deploy the matching Worker before the frontend so village collision, enemy positions and appearance saves agree. Existing character keys, authentication verification and Durable Object namespace are retained. No private saves or OAuth secret files are included.

## Face and turning follow-up

Slime facing now eases along the shortest angle with the original exponential turn response. Local gameplay aim and network directions remain immediate, while the rendered local player, remote players, creatures, menu preview and duel/practice fighters turn smoothly. Attack turns use a faster response so the visual stays close to the authoritative hit direction.

The original face geometries, colors, X/Y spacing and proportions are retained. Mouth, smile and cheek depth is corrected to sit on the curved dome rather than disappearing into it. Original idle/blink/spit poses reset every frame; eye highlights follow blinks and cosmetic eye size. Duel/practice no longer runs the old overhaul facial-expression block. No tests or browser playtests were run.

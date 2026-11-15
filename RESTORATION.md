# Slimoo — original character and village repair

## Character source

The construction function and movement/slap/spit animation expressions are extracted directly from D:\downloads\index.html into rpg-original-slime.mjs. The source file remains untouched. The original dome and skirt, dark eyes, blush, seven laurel leaves, fingered hands, outline thickness, toon ramp, mouth and slap timing are retained.

The shared RPG rig adds clothing, job animations, equipment and cosmetic proportions around this source. Meadow players, the live menu preview and villagers use it. Duel/practice fighters also call the original factory and animation function. Wild creatures use the same visual language with species-specific wildlife features and shared hit reactions.

## Character customization

The main menu has a live rotating preview and slap, spit, walk, jump and wave controls. Size, roundness, height, hands, eyes, custom color, laurel, cheeks and equipment visibility can be changed. Original resets the reference proportions. Appearance is cosmetic: combat stats, hitboxes and authoritative movement do not change. Validated appearance is stored with the character and sent in roster/appearance updates; it is not repeated in every world snapshot. Google account summaries include the saved appearance.

## Enterable village

Architecture retains the timber, colored roofs, plaster, signs and shop-specific detailing. Buildings have larger interiors, 4m open doorways (4.4m at the inn), real separate walls, floors and roofs. NPCs and workstations are inside. One layout module determines building transforms, NPC coordinates, collision walls and camera obstacles. Both the client and Worker use these walls. Village terrain is leveled and trees are excluded from the building footprints. The east exit and central plaza stay open.

## Hunting areas

Creatures are arranged into five habitats per tier rather than straight rows. Spawn selection excludes water and shore margins, paths, the village, the duel ring, obstacles and steep terrain. If a placement cannot be found it is skipped rather than falling back into water. Chasing, returning and lunging creatures are kept outside pond margins. Creature models use original slime anatomy plus wings, ears, shells, horns, foliage and other family details.

## Interface

The menu is centered on the character preview and direct mode choices. The bag has SVG item illustrations, category filters, equipped markers, quantity badges, empty slots and a persistent details/comparison pane. Supplies and materials have their own relevant actions instead of weapon comparisons.

## Delivery

No tests or browser playtests were run for this pass, as requested. The asset build only copies distribution files and does not prove runtime or visual correctness. Production was not deployed. Deploy the matching Worker before the frontend so village collision, enemy positions and appearance saves agree. Existing character keys, authentication verification and Durable Object namespace are retained. No private saves or OAuth secret files are included.

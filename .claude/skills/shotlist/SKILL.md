---
name: shotlist
description: Check a folder of stills from a shoot for coverage, the way a field producer or script supervisor would before the crew leaves the location. Looks at every photo, names each shot (size, angle, subject), checks the coverage the kind of shoot needs (an interview, a process or demonstration, an event, or whatever the brief describes) and any planned shot list, flags continuity and technical problems, and lists the pickups to get. Use when someone asks "do we have coverage?", "check this shoot", "check my shot list", or points at a folder of photos from a shoot (usually `_media/<shoot>/`).
---

# shotlist: do we have coverage?

You are the field producer and script supervisor. The crew has a folder of stills and one question before they leave: **could an editor cut this, or do we need more?** Answer that, concretely enough that a camera operator could go and get what's missing.

This is the same job the app's `/shot-list` page does through Gemini; here you look at the photos yourself.

## 1. Find the shoot

- The folder is usually `_media/<shoot>/` at the repo root (gitignored, local only). If the user didn't name one, list `_media/` and ask which, or take the only one there.
- Look for a **`shoot.md`** in the folder: it says what kind of shoot this is, what it's for, and (optionally) the planned shot list. The three files in `shoots/` beside this skill are samples of it; copy one into the folder as a starting point.
- No `shoot.md`? Ask the user one question: what were you shooting, and what is it for? If they'd rather you work it out, infer it from the photos and say what you inferred.

## 2. Look at every photo

- List the images (`.jpg`, `.jpeg`, `.png`, `.heic`) and sort them by filename; camera numbering keeps the shooting order. Number them 1, 2, 3… in that order and keep the filename beside each number.
- Full-size phone photos cost a lot to read. Make small copies first, in a hidden folder inside the shoot (still gitignored), then read those:

  ```sh
  mkdir -p "_media/<shoot>/.small"
  ```

  ```sh
  sips -s format jpeg -Z 1024 "_media/<shoot>/IMG_0001.HEIC" --out "_media/<shoot>/.small/IMG_0001.jpg"
  ```

  (`sips` is built into macOS and converts HEIC too. Do one per file, or loop over the folder.)
- Read every small copy. Don't skip any and don't sample: a missing shot is exactly what you're looking for.

## 3. Name each shot

For each photo: **size and kind** (establishing, wide, full, medium, medium close-up, close-up, extreme close-up, insert, cutaway, over-the-shoulder, POV, reaction, two-shot…), **subject** (what it shows; describe people by what they're doing, never guess who they are), **angle** (eye level, high, low, overhead, Dutch), and whether it's **usable**. Note technical problems that would sink it: soft focus, blown or crushed exposure, motion blur, tilted horizon, bad headroom, something growing out of a head, a crew member or light stand in frame.

## 4. Check coverage

Start from the needs of the kind of shoot (the sample in `shoots/` closest to it, or the brief), then add what this particular scene calls for and drop what doesn't apply. Mark each need **covered**, **partial**, or **missing**, with the shot numbers that cover it. If there's a planned shot list, check every line of it too, in the crew's own words.

Always consider, whatever the shoot:

- **Where are we?** An establishing shot and a wide that shows the geography.
- **Size variety.** Wide, medium, and close for the main subject, so the editor can cut without jump cuts.
- **The five-shot sequence** for any action: close-up on the hands, close-up on the face, a wide, an over-the-shoulder, and an unusual angle.
- **Something to cut away to.** Inserts, details, reactions, cutaways: the shots that hide an edit.
- **Beginning and end.** A way into the scene and a way out of it.

## 5. Continuity

Flag what a script supervisor would catch between shots meant to cut together: props, hands, sleeves, hair, or drinks that change; light or color temperature that shifts; eyelines that don't match; screen direction that crosses the 180° line; two shots too close in size and angle to cut between (a jump cut).

## 6. Report

Write the report to `_media/<shoot>/coverage.md` (it stays local) and show it in the chat. Use this shape:

```markdown
# Coverage: <Covered | Nearly | Not yet>

**Shoot:** <kind, and what it's for>
**Stills:** <n> · checked <date>

<Two to four sentences: what the scene is and whether it can be cut as it stands.>

## Pick up before you leave
1. **<The shot, specific enough to go and get it>**: <why the edit needs it>

## Coverage
| | Need | Shots | Note |
| --- | --- | --- | --- |
| ✅ covered / 🟡 partial / ❌ missing | <need> (planned) | #3, #7 | <note> |

## Continuity and technical flags
- **#4, #5**: <the problem>

## The shots
1. **<size>, <angle>**: <subject>. <notes> `IMG_0001.HEIC`

## A rough cut from what you have
#1 → #6 → #3 → … <one line on how it plays>
```

Pickups go first because they're what the crew acts on while still on location. Be plain and short: no praise, no preamble. If the user is still on the shoot, offer to re-check once they've added the pickups; on a re-check, read only the new files and update the report.

## The sample shoots

`shoots/` holds three sample `shoot.md` files with different coverage needs. Use the closest one as the checklist, and copy one into a shoot folder as its `shoot.md` to start:

- **`interview.md`**: a sit-down interview. Coverage is about the person: matched sizes on the subject, the interviewer's side for reverse shots, and B-roll to cover edits in what they say.
- **`process.md`**: a process or demonstration (the loom workshop, a recipe, a repair). Coverage is about the steps: every step in order, hands and tool close-ups, matching action across sizes, a before and an after.
- **`event.md`**: an event (a talk, a gathering, an opening). Coverage is about the room: the place and the crowd, the speaker from more than one angle, reactions, signage and details, the arc from arrival to departure.

# Jimmy's Car rules

This is the application’s working rules reference, synthesized from the public [Jimmy's Car Rules deck](https://docs.google.com/presentation/d/1q6X_EemFlPRwvF9Zb2lR3d5MEDqryjU-YRA183Szs38/edit). It makes the current social rules concrete where the software will need deterministic behavior.

## Participation and weekly rhythm

- Anyone who has ridden in Jimmy’s car may participate.
- A new participant adds seven songs that are not already active on the tier list and chooses the color for their spreadsheet column.
- Jimmy ranks the active playlist every week and publishes a new dated edition, generally by Sunday.
- The Google Sheet remains the familiar weekly view while the database-backed workflow is built.

## Ranking snapshots

- Every weekly edition is a snapshot: each active song has an owner and is in exactly one tier: **S**, **A**, **B**, **C**, **D**, or **F**.
- The spreadsheets also contain points, totals, Top 5 selections, comments, and pick-order material. The first importer preserves tier placement, ownership, and source location; those other presentation details can be added later.
- Historical sheets usually lack artist and Spotify IDs. A title is therefore a provisional identity and Spotify reconciliation must not silently merge distinct same-title songs.

## Swaps

- A swap names one active song to remove and provides a Spotify link for one new song to add.
- Swaps are normally due Thursday morning. The effective cutoff is when Jimmy begins processing, so early submissions are safer.
- An outgoing song may belong to anyone, but it must be **B tier or lower** in the latest published edition.
- An incoming song must not already be active on the tier list.
- Future Discord and website submissions should record participant, submitted time, outgoing song, and incoming Spotify track before modifying the playlist.

## Conflict resolution

- If multiple swaps remove the same song and one participant is removing their own song, that participant keeps the requested removal. Jimmy selects a replacement outgoing song for the other swap.
- If multiple participants remove the same song and none owns it, Jimmy selects replacement outgoing songs for both swaps.
- If multiple participants add the same incoming song, the later chronological submission is normally invalidated.
- Jimmy may make exceptions when circumstances require it. The admin workflow must therefore allow a recorded decision instead of treating automatic resolution as irreversible.

## Special cases

- A participant with no active songs may return by adding one song without removing another: a **return swap**.
- A song rated **F tier in two consecutive weekly editions** is removed without a replacement. The playlist can therefore become shorter over time.

## The Jimmies

- The Jimmies is the yearly award show, held on the Sunday nearest June 22.
- Jimmy selects a favorite song from each participant who made a swap in the preceding year, plus six superlative awards for songs from that year.
- Results are shared in the Jimmy’s Car Discord channel in spreadsheet and slideshow form.

## Data-model consequences

- Retain each source worksheet snapshot because the supplied historical workbooks overlap during transitions.
- Select one canonical snapshot per date while retaining noncanonical source data for traceability.
- Treat swap processing as a reviewable state machine. The final action can become one button only after validation, conflict resolution, and preview are complete.

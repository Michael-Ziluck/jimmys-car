const TRAILING_ANNOTATION: RegExp =
  /^(?:\d{2,4}\s+)?(?:remaster(?:ed)?|version|edit|mix|live|mono|stereo|acoustic|demo|radio|bonus|soundtrack)\b|^(?:feat(?:uring)?\.?|ft\.?|with|from)\b/i;

export function normalizeSongTitle(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2010-\u2015]/g, "-")
    .toLocaleLowerCase("en-US");
}

/** Removes only recognized Spotify-style trailing metadata, never arbitrary title text. */
export function songTitleMatchKey(value: string): string {
  let title: string = normalizeSongTitle(value);
  let previous: string;
  do {
    previous = title;
    title = title
      .replace(
        /\s*[([]([^\])]+)[\])]\s*$/,
        (match: string, annotation: string) =>
          TRAILING_ANNOTATION.test(annotation.trim()) ? "" : match,
      )
      .trim();
    title = title
      .replace(/\s+-\s+([^\n]+)$/, (match: string, annotation: string) =>
        TRAILING_ANNOTATION.test(annotation.trim()) ? "" : match,
      )
      .trim();
  } while (title !== previous);
  return title;
}

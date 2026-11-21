import { commanderFor, type CommanderDef } from '../model/defs/commanders';

/**
 * Split an authored line into an explicit commander speaker and the remaining text.
 *
 * Only a prefix that resolves to a commander counts. A colon in prose (`El algodón baja a la costa: con
 * él…`) used to be read as a speaker name: the clause became the label and disappeared from the line.
 */
export function splitSpeaker(text: string): { commander: CommanderDef; text: string } | null {
  const match = text.match(/^\s*([^:\n]{2,40}):\s/);
  const name = match?.[1]?.trim();
  const commander = name ? commanderFor(name) : undefined;
  return match && commander ? { commander, text: text.slice(match[0].length) } : null;
}

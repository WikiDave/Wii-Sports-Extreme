// A chat with a Mii on the island who has no talk of its own (villagers, fishermen, skaters,
// guards): a hello, then island gossip (wereld/gossip.js, so the weather tip is true). Guards
// say guard things. 'Nog iets?' asks for the next line.

import { h, modal } from '../../ui/dom.js';
import { gossip } from '../wereld/gossip.js';

const HELLO = ['Hoi!', 'Hé, hallo daar!', 'Mooi weertje, hè?', 'Ook een dagje eiland?', 'Goeiedag!', 'O, jij bent die nieuwe!'];
const GUARD = [
  'Doorlopen, niks te zien hier.',
  'Ik hou je in de gaten, hoor.',
  'Limonade? Ik heb geen limonade gezien. Jij wel?',
  'Rustig aan. Het is een eiland, geen racebaan.',
  'Mijn zaklamp is nieuw. Mooi, hè?',
  'Als je iets verdachts ziet, zeg je het tegen mij. Afgesproken?',
];

/** Opens the chat with who: { name, guard }. seed picks the lines, so a Mii does not always open the same way. */
export function openChat(game, who, seed = 0) {
  let k = seed;
  const line = h('p', { class: 'chat-line' });
  const say = () => {
    line.textContent = who.guard ? GUARD[k % GUARD.length] : gossip(game.state.day, k);
    k++;
  };
  say();
  modal({
    title: who.guard ? `Bewaker ${who.name}` : who.name,
    body: h('div', { class: 'chat' }, h('p', { class: 'chat-hello' }, HELLO[seed % HELLO.length]), line),
    actions: [
      { label: 'Nog iets?', onClick: () => (say(), false) },
      { label: 'Doei', kind: 'primary' },
    ],
  });
}

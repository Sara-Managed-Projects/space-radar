// The questions at the end of a trip and the quiz's own words (forge #566, ui/tripquiz.js). Imported by that module only,
// which the end card's "Three questions" button fetches, so neither a first visit nor a trip that is not finished carries
// them. The button's own words stay in copy/en.later.js `tripQuiz` (open, openTitle); this adds the rest to that section.
import { COPY } from './en.js';
import './en.later.js';
import { HOOK } from './lang.js';

Object.assign(COPY.tripQuiz, {
  "intro": "Every answer is on one of this trip’s stops.",
  "groupLabel": "Question {n} of {total}",
  "right": "Right.",
  "wrong": "Not quite. The answer: {answer}",
  "from": "Where the trip says it: stop {n}, {title}",
  "score": "{n} of {total} right",
  "kept": "Kept in this browser only.",
  "again": "Ask again",
  "trips": {
    "people-in-space": [
      {
        "q": "How long does the space station take to go once round the Earth?",
        "a": [
          "About a day",
          "About 93 minutes",
          "About eight minutes"
        ]
      },
      {
        "q": "How many sunrises does the station’s crew see in a day?",
        "a": [
          "One, like us",
          "Fifteen or sixteen",
          "About a hundred"
        ]
      },
      {
        "q": "How many people live on Tiangong at a time?",
        "a": [
          "Three",
          "Seven",
          "Twelve"
        ]
      }
    ],
    "moon-landings": [
      {
        "q": "How long did Neil Armstrong and Buzz Aldrin stay on the Moon?",
        "a": [
          "About two hours",
          "21 hours and 36 minutes",
          "Three days"
        ]
      },
      {
        "q": "Who drove the Lunokhod 1 rover?",
        "a": [
          "Two cosmonauts on board",
          "A team of five controllers on Earth",
          "Nobody: it chose its own way"
        ]
      },
      {
        "q": "Chang’e 4 landed on the side of the Moon that never faces us. How did it talk to Earth?",
        "a": [
          "Through a relay satellite, Queqiao",
          "Straight to Earth by radio",
          "It never could"
        ]
      }
    ],
    "outer-solar-system": [
      {
        "q": "Why does Io have hundreds of volcanoes?",
        "a": [
          "It is the moon closest to the Sun",
          "Jupiter and two other moons keep kneading it",
          "Comets keep crashing into it"
        ]
      },
      {
        "q": "How thick are Saturn’s rings in places?",
        "a": [
          "About ten metres",
          "About a thousand kilometres",
          "As thick as the Earth is wide"
        ]
      },
      {
        "q": "How many spacecraft have ever visited Neptune?",
        "a": [
          "None",
          "One, Voyager 2",
          "Five"
        ]
      }
    ],
    "the-sun-today": [
      {
        "q": "How long does sunlight take to reach the Earth?",
        "a": [
          "No time at all",
          "About eight minutes and twenty seconds",
          "About a day"
        ]
      },
      {
        "q": "About how often does the number of sunspots rise and fall?",
        "a": [
          "Every year",
          "About every eleven years",
          "About every thousand years"
        ]
      },
      {
        "q": "How many Earths would fit inside the Sun?",
        "a": [
          "About ten",
          "About a thousand",
          "More than a million"
        ]
      }
    ],
    "life-of-a-star": [
      {
        "q": "What makes the Sun shine?",
        "a": [
          "It burns like a coal fire",
          "Deep inside, it turns hydrogen into helium",
          "It reflects the light of other stars"
        ]
      },
      {
        "q": "What is left at the centre of the Helix Nebula?",
        "a": [
          "A black hole",
          "A small, very hot star: a white dwarf",
          "Nothing at all"
        ]
      },
      {
        "q": "Who saw the explosion that left the Crab Nebula, in the year 1054?",
        "a": [
          "Chinese astronomers",
          "Galileo, with his telescope",
          "The Hubble Space Telescope"
        ]
      }
    ],
    "black-holes": [
      {
        "q": "What is a black hole?",
        "a": [
          "An empty hole in space",
          "A place where gravity is so strong that nothing gets out, not even light",
          "A star that has switched off for a while"
        ]
      },
      {
        "q": "How massive is the black hole at the centre of our galaxy?",
        "a": [
          "About as massive as the Sun",
          "About four million times as massive as the Sun",
          "As massive as the whole galaxy"
        ]
      },
      {
        "q": "If the Sun were swapped for a black hole of the same mass, what would the planets do?",
        "a": [
          "Fall in",
          "Stay in their orbits, and get a lot colder",
          "Fly off into space"
        ]
      }
    ],
    "mars-where-we-have-driven": [
      {
        "q": "How long is a day on Mars?",
        "a": [
          "Forty minutes longer than ours",
          "Twice as long as ours",
          "Half as long as ours"
        ]
      },
      {
        "q": "Opportunity was built to last ninety Martian days. How long did it keep going?",
        "a": [
          "Ninety days, as planned",
          "More than fourteen years",
          "About a year"
        ]
      },
      {
        "q": "How many flights did the little helicopter Ingenuity make?",
        "a": [
          "One",
          "Twelve",
          "72"
        ]
      }
    ]
  }
});

// The section in the visitor's language when a translation has it (copy/lang.js): now with the keys this file added.
if (HOOK.localise) HOOK.localise({ COPY }, ['tripQuiz']);

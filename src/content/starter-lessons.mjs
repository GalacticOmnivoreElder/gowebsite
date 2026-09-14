// Canonical course content. Stable IDs preserve existing progress.
const lessons = [
  {
    "world": 1,
    "slug": "notice",
    "title": "Notice",
    "badgeId": "signal-seeker",
    "badgeTitle": "Signal Seeker",
    "skillId": "observe-game-systems",
    "skillTitle": "Observe game systems",
    "missionXp": 50,
    "nextRouteKey": "imagine",
    "nextRouteLabel": "Imagine",
    "modes": [
      "drawing",
      "paper-prototype",
      "no-code",
      "level-editor",
      "game-engine",
      "programming"
    ],
    "access": "free",
    "id": "notice",
    "promise": "See how a player's action changes what happens next.",
    "idea": "A game gives a player something to do, rules that respond, and a new situation to consider. This repeating conversation is the game loop.",
    "example": "Imagine a race to collect three stars. Choose a path, move, collect a star if one is there, then choose again. Each result changes the next decision.",
    "mission": "Explore one small loop in a game you know. Follow an action, its result, and the next choice. Try it again and notice what changes.",
    "approachPrompt": "Where will you begin observing?",
    "approaches": [
      {
        "id": "one-turn",
        "label": "Follow one turn",
        "detail": "Choose one action and trace what the rules change before the next turn."
      },
      {
        "id": "repeat-choice",
        "label": "Compare two choices",
        "detail": "Try two different actions from the same situation. Notice how their results differ."
      }
    ],
    "steps": [
      "Choose a familiar game or a simple game you can imagine.",
      "Trace three to five moments: choice, action, result, and the next choice.",
      "Identify what the player learns from the result."
    ],
    "principle": "Understand what repeats before adding more to it.",
    "evidencePrompt": "Keep whatever helps you remember: a few words, a sketch in your own notebook, or a link to something you made. Nothing needs to be uploaded.",
    "reflectionPrompt": "What starts the loop, and how does the player know something changed?"
  },
  {
    "world": 2,
    "slug": "imagine",
    "title": "Imagine",
    "badgeId": "idea-orbit",
    "badgeTitle": "Idea Orbit",
    "skillId": "define-player-experience",
    "skillTitle": "Define player experience",
    "missionXp": 50,
    "nextRouteKey": "shape",
    "nextRouteLabel": "Shape",
    "modes": [
      "drawing",
      "paper-prototype",
      "no-code",
      "level-editor",
      "game-engine",
      "programming"
    ],
    "access": "community",
    "id": "imagine",
    "promise": "Choose the experience you want a player to have.",
    "idea": "Begin with what the player does and why that action might matter to them. A small, clear experience gives every later decision a purpose.",
    "example": "The player guides a lost traveller home by choosing which paths to trust. The action is choosing a path; the hoped-for feeling is curious uncertainty.",
    "mission": "Complete the thought: The player gets to… Choose one main action and one feeling or experience you want to explore.",
    "approachPrompt": "What will guide your idea?",
    "approaches": [
      {
        "id": "action-first",
        "label": "Start with an action",
        "detail": "Choose something the player does, then ask what could make it interesting."
      },
      {
        "id": "feeling-first",
        "label": "Start with a feeling",
        "detail": "Choose an experience such as discovery or tension, then find an action that could create it."
      }
    ],
    "steps": [
      "Describe what the player gets to do in one sentence.",
      "Choose the action that matters most.",
      "Imagine the smallest situation in which that action could feel interesting."
    ],
    "principle": "A clear player experience is more useful than a long list of features.",
    "evidencePrompt": "Capture the idea in whatever form feels natural. A sentence, a rough sketch, or a note kept elsewhere is enough.",
    "reflectionPrompt": "If only one action remained, would it still express your idea?"
  },
  {
    "world": 3,
    "slug": "shape",
    "title": "Shape",
    "badgeId": "scope-scout",
    "badgeTitle": "Scope Scout",
    "skillId": "design-rules-and-scope",
    "skillTitle": "Design rules and scope",
    "missionXp": 75,
    "nextRouteKey": "build",
    "nextRouteLabel": "Build",
    "modes": [
      "drawing",
      "paper-prototype",
      "no-code",
      "level-editor",
      "game-engine",
      "programming"
    ],
    "access": "community",
    "id": "shape",
    "promise": "Turn your idea into choices with understandable consequences.",
    "idea": "Rules define what is possible. A meaningful choice offers alternatives with different consequences, and feedback helps the player understand those consequences.",
    "example": "A traveller can take a safe, slow route or a short route that uses a limited supply. Neither is always best: the useful choice depends on what is left.",
    "mission": "Choose a goal, a few rules, one meaningful decision, and a clear way for the player to notice the result.",
    "approachPrompt": "How will you examine your rules?",
    "approaches": [
      {
        "id": "trace-decision",
        "label": "Trace a decision",
        "detail": "Follow each option to its consequence and check why a player might choose it."
      },
      {
        "id": "find-boundary",
        "label": "Try a boundary case",
        "detail": "Ask what happens when a resource runs out, a move is repeated, or a goal is reached."
      }
    ],
    "steps": [
      "State what the player is trying to achieve.",
      "Define what they can do, what limits them, and what changes after an action.",
      "Walk through two possible choices and make their consequences clear."
    ],
    "principle": "Every rule should help create or clarify the experience.",
    "evidencePrompt": "Keep a rules reminder in a form you enjoy. Short notes or a simple diagram can help you revisit a decision later.",
    "reflectionPrompt": "Which rule creates an interesting decision? Which could you remove?"
  },
  {
    "world": 4,
    "slug": "build",
    "title": "Build",
    "badgeId": "builder-spark",
    "badgeTitle": "Builder Spark",
    "skillId": "prototype-playable-systems",
    "skillTitle": "Prototype playable systems",
    "missionXp": 100,
    "nextRouteKey": "test",
    "nextRouteLabel": "Test",
    "modes": [
      "drawing",
      "paper-prototype",
      "no-code",
      "level-editor",
      "game-engine",
      "programming"
    ],
    "access": "community",
    "id": "build",
    "promise": "Make the smallest version of your idea that someone can play.",
    "idea": "A prototype makes a design question playable. It only needs enough structure for a person to choose an action, experience the result, and choose again.",
    "example": "To explore risky paths, you only need two routes, a limited supply, and a goal. A larger world can wait until this decision is worth repeating.",
    "mission": "Make one complete loop that can be tried in a few minutes. Use any means you prefer, and leave out anything that does not help you explore the main action.",
    "approachPrompt": "What will your first version explore?",
    "approaches": [
      {
        "id": "complete-loop",
        "label": "One complete loop",
        "detail": "Make the main action, its result, and the next choice work from beginning to end."
      },
      {
        "id": "uncertain-rule",
        "label": "One uncertain rule",
        "detail": "Build just enough to discover whether your most uncertain design decision works."
      }
    ],
    "steps": [
      "Name the question your prototype should help answer.",
      "Make the action and its consequences possible to experience.",
      "Play a short round yourself and remove anything that gets in the way."
    ],
    "principle": "Build enough to learn, then let what you learn guide the next version.",
    "evidencePrompt": "Leave a reminder of what you tried or kept out. You can describe it here, link to it, or document it privately elsewhere.",
    "reflectionPrompt": "What became clearer when the idea could actually be played?"
  },
  {
    "world": 5,
    "slug": "test",
    "title": "Test",
    "badgeId": "playtest-oracle",
    "badgeTitle": "Playtest Oracle",
    "skillId": "observe-players-and-improve",
    "skillTitle": "Observe players and improve",
    "missionXp": 100,
    "nextRouteKey": "share",
    "nextRouteLabel": "Share",
    "modes": [
      "paper-prototype",
      "no-code",
      "level-editor",
      "game-engine",
      "programming"
    ],
    "access": "community",
    "id": "test",
    "promise": "Use what players do to decide what to improve.",
    "idea": "A playtest compares your intention with someone's experience. Observe before explaining, separate what happened from your interpretation, and change one thing you can learn from.",
    "example": "A player repeats a move because they missed its result. Instead of adding a new rule, make the existing result easier to notice and try again.",
    "mission": "Invite someone to try a short round. Notice their choices and moments of uncertainty, then make one change and try again. If nobody is available, test a different choice yourself and note what still needs another perspective.",
    "approachPrompt": "What will you pay attention to?",
    "approaches": [
      {
        "id": "clarity",
        "label": "What is understood",
        "detail": "Watch whether the player can discover an action and recognise its result."
      },
      {
        "id": "decisions",
        "label": "How choices feel",
        "detail": "Watch which options they consider, ignore, or repeat, and ask why after the round."
      }
    ],
    "steps": [
      "Choose one question to investigate and let the first round unfold.",
      "Notice what happened before deciding what it means.",
      "Change one thing, try again, and compare the experience."
    ],
    "principle": "Treat surprises as information. Test your assumptions, not the player's ability.",
    "evidencePrompt": "Record only what is useful to you: a surprise, an observation, or a change you want to revisit. Leave out other people's personal details.",
    "reflectionPrompt": "What did the playtest reveal that you had not expected?"
  },
  {
    "world": 6,
    "slug": "share",
    "title": "Share",
    "badgeId": "signal-sender",
    "badgeTitle": "Signal Sender",
    "skillId": "communicate-and-present",
    "skillTitle": "Communicate and present",
    "missionXp": 125,
    "nextRouteKey": "projects",
    "nextRouteLabel": "GO Projects",
    "modes": [
      "drawing",
      "paper-prototype",
      "no-code",
      "level-editor",
      "game-engine",
      "programming"
    ],
    "access": "community",
    "id": "share",
    "promise": "Help someone understand your game and choose its next step.",
    "idea": "Sharing gives an experiment a life beyond its maker. A useful introduction explains what it is, how to try it, what you learned, and what you might explore next.",
    "example": "This is a short game about choosing uncertain paths. Reach home before supplies run out. Testing helped me clarify the result of each move. Next I want to explore a second reason to take a risk.",
    "mission": "Introduce your game to someone in a way that suits you. Cover Name, Play, Learn, and Next. A conversation or a private note counts; public posting is your choice.",
    "approachPrompt": "How will you introduce the experience?",
    "approaches": [
      {
        "id": "invite-play",
        "label": "Invite someone to play",
        "detail": "Give them just enough context to begin, then share what you learned."
      },
      {
        "id": "tell-journey",
        "label": "Tell the story of the experiment",
        "detail": "Explain the idea, a decision that changed, and the next question you want to explore."
      }
    ],
    "steps": [
      "Name the game and explain how someone can begin.",
      "Share one thing you learned and one change it led to.",
      "Choose a small next experiment, or take a break and return with fresh eyes."
    ],
    "principle": "Finishing one experiment is a beginning for the next. Return to any step whenever it helps.",
    "evidencePrompt": "Document the journey in the way that feels right to you. Keep it private, share it with someone you trust, or add an optional public summary below.",
    "reflectionPrompt": "What would you like to explore next, and why?"
  }
];
export default lessons;

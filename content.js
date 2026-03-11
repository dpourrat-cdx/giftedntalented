(function () {
  const content = {
    hero: {
      eyebrow: "Mission Control",
      title: "Captain Nova's Rocket Mission",
      copy: "A story-driven gifted practice adventure for brave young engineers.",
      metrics: {
        steps: "{count} Mission Steps",
        parts: "{count} Rocket Parts",
        time: "Final Launch in {minutes} Minutes",
      },
    },
    scoreboard: {
      kicker: "Explorer Record",
      awaitingName: "Type an explorer name",
      awaitingScore: "Enter the explorer name below to show only that explorer's best score.",
      loading: "Checking this explorer's saved record.",
      empty: "No saved record yet for this explorer.",
      localSaveSuccess: "Explorer record saved on this device.",
      deviceOnlyWarning: "Explorer record saved on this device. Online sync could not update just now.",
      deviceResetSuccess: "Every saved explorer record on this device has been cleared.",
      allResetSuccess: "Every saved explorer record has been cleared.",
      resetPrompt: "Enter the admin PIN to clear saved explorer records.",
      resetConfirm: "Clear every saved explorer record on this device? This cannot be undone.",
    },
    parentArea: {
      toggle: "Parent Area",
      kicker: "Parent Area",
      copy: "Restart the mission or manage saved scores without interrupting the story.",
      restart: "Restart Mission",
      reset: "Reset Saved Scores",
    },
    dashboard: {
      buildTitle: "Rocket Build",
      timerLabel: "Mission Timer",
      scoreLabel: "Mission Score",
      buildNote: "Each solved mission step helps Captain Nova finish the rocket.",
      missionsTitle: "Rocket Missions",
      tipTitle: "Captain Nova Tip",
      tipCopy:
        "Take a slow breath, read carefully, and imagine each smart answer clicking a new rocket part into place.",
    },
    start: {
      briefingTitle: "Mission Briefing",
      nameLabel: "Explorer Name",
      namePlaceholder: "Type your explorer name here",
      emptyNameHint: "Mission Control needs your name before the countdown can begin.",
      readyNameHint: "Press Enter to start Mission 1: Verbal Challenge.",
      emptyPrompt: "Type your name to join Captain Nova's mission.",
      readyPrompt: "Hi {name}! Captain Nova is ready for liftoff.",
      counter: "{count} mission steps across {missions} missions",
      badge: "Mission Briefing",
      emptyNextHint: "Type your name to begin the mission.",
      readyNextHint: "Press Enter to start Mission 1: Verbal Challenge.",
      playerReadyNote: "Explorer {name}, your mission console is ready.",
    },
    question: {
      counter: "Mission Step {current} of {total}",
      selectHint: "Choose an answer to power up Check Answer.",
      validateHint: "Press Check Answer to power the next rocket step.",
      allAnsweredHint: "All {count} mission steps are complete. Launch the rocket when you are ready.",
      lockedHint: "Rocket step locked in. Press Next Mission Step.",
      playerNote: "Explorer {name} is flying Mission {missionNumber}.",
      buttons: {
        check: "Check Answer",
        next: "Next Mission Step",
        launch: "Launch the Rocket",
        finished: "Mission Complete",
      },
      feedback: {
        correctTitle: "Rocket power confirmed",
        wrongTitle: "Mission Control correction",
        yourAnswer: "Your answer:",
        correctAnswer: "Correct answer:",
        why: "Why:",
        noAnswer: "No answer selected",
      },
    },
    results: {
      eyebrow: "Launch Report",
      summarySuffix: "Captain Nova's launch report is ready below.",
      timeSummary: "Mission time used: {used} of {total}.",
      retry: "Build Another Rocket",
      back: "Return to Mission",
      debriefTitle: "Mission Debrief",
      debriefCopy: "Open this report to review missed mission steps and the correct solutions.",
      perfectTitle: "Legendary Launch",
      perfectBody: "Captain Nova's rocket launched with every system working perfectly.",
      sectionSummary: "{correct} mission steps powered out of {total}",
      sectionPercent: "{percent}% mission power in this system",
      summaryBands: [
        {
          min: 85,
          text: "Legendary engineering. Captain Nova built a rocket ready for deep space.",
        },
        {
          min: 70,
          text: "Strong mission work. A little more precision will send the next rocket even farther.",
        },
        {
          min: 55,
          text: "Good progress. A few more practice missions will make the rocket stronger and steadier.",
        },
        {
          min: 0,
          text: "This launch was a brave start. Review the mission debrief and build an even better rocket next time.",
        },
      ],
      endingTitle: "Captain Nova's Final Flight",
      scorePill: "{percent}% mission score",
      completePill: "Mission Complete",
    },
    story: {
      title: "Captain Nova's Rocket Mission",
      introduction: {
        kicker: "Introduction",
        pill: "Before Mission 1",
        secondaryPill: "8 Rocket Parts to Unlock",
        text:
          "Welcome, Explorer! Mission Control needs your help. Captain Nova has discovered a mysterious new planet far beyond Earth, but there is one big problem — the rocket is not ready yet. To build it, you must complete eight important missions across the space station. Each mission protects a different rocket part, and only a sharp young engineer can unlock them. Solve the challenges, collect every piece, and prepare the ship for liftoff. When all eight missions are complete, Captain Nova can begin the greatest journey in the galaxy!",
      },
      missions: [
        {
          section: "Verbal",
          number: 1,
          title: "Verbal Challenge",
          rocketPart: "Rocket Base",
          introduction:
            "Captain Nova steps into the Word Vault, where glowing letters drift through the air like fireflies. Hidden beneath the swirling words is the rocket base — the strong foundation that holds the whole ship together. But the vault only opens for explorers who can choose the correct words. Pick carefully, stay focused, and break the word lock. Win this mission, and the rocket base will rise into place.",
          midMissionUpdate:
            "Mission Control checking in! The Word Vault is shaking, and some of the glowing letters are starting to scramble out of order. If the wrong words take over, the rocket base could stay locked inside forever. Stay focused, Explorer — you are close to breaking the word lock.",
          rewardDebrief:
            "You did it! Just as the letter storm grows wild, the correct words flash into place and the vault unlocks. The rocket base rises safely from the floor of the station, solid and strong. Captain Nova secures it with relief — the mission is back on track.",
        },
        {
          section: "Math",
          number: 2,
          title: "Math Challenge",
          rocketPart: "Rocket Body",
          introduction:
            "Captain Nova enters the Number Chamber, where shining numbers spin in great rings around the room. At the center floats the rocket body, locked behind a field of math energy. To release it, you must solve the puzzles and steady the spinning number patterns. Every correct answer weakens the lock. Complete the mission, and the rocket body will connect to the base.",
          midMissionUpdate:
            "Mission Control update! The number rings are spinning faster again, and the math field is becoming unstable. If it overloads, the rocket body could drift out of reach before it can connect to the base. Keep calculating carefully — there is still time to bring it under control.",
          rewardDebrief:
            "Great work! Your answers steady the number rings, and the crackling math field suddenly collapses. The rocket body lowers into position with a heavy metallic clang and locks onto the base. Captain Nova checks the structure and smiles — disaster avoided.",
        },
        {
          section: "Nonverbal",
          number: 3,
          title: "Pattern Vision",
          rocketPart: "Rocket Window",
          introduction:
            "Captain Nova moves into the Hall of Patterns, a silent room covered in glowing shapes and strange pictures. No words appear here, and no numbers can help. Only explorers who can spot the hidden pattern may claim the next rocket part. Solve the visual puzzle, and you will unlock the bright rocket window. With it, Captain Nova will be able to look out into deep space.",
          midMissionUpdate:
            "Mission Control here! The wall patterns are shifting more quickly now, and some of the glowing shapes are starting to fade. If the pattern disappears completely, the rocket window may remain hidden behind the wall. Look closely, Explorer — the answer is still there.",
          rewardDebrief:
            "Success! At the last moment, the hidden pattern snaps into perfect alignment and the wall slides open. A shining rocket window glides free, bright and clear. Captain Nova installs it carefully, and the stars become visible once again.",
        },
        {
          section: "Spatial",
          number: 4,
          title: "Spatial Assembly",
          rocketPart: "Rocket Wings",
          introduction:
            "Captain Nova enters the Assembly Bay, where metal pieces drift weightlessly in every direction. Some are curved, some are sharp, and some look like they fit together in unexpected ways. Somewhere inside this floating puzzle are the rocket wings, needed to guide the ship safely. Turn the pieces in your mind and find how they belong. Solve the challenge, and the wings will unfold into position.",
          midMissionUpdate:
            "Mission Control update! The floating metal pieces are starting to spin into a wild storm inside the Assembly Bay. If they scatter too far apart, the rocket wings may never form correctly. Think fast and fit the shapes together before the puzzle breaks apart.",
          rewardDebrief:
            "Excellent! The final pieces click together just before the metal storm tears them away. With a powerful snap, the rocket wings unfold into place on both sides of the ship. Captain Nova secures them and reports that the rocket is stable again.",
        },
        {
          section: "Patterns",
          number: 5,
          title: "Pattern Reactor",
          rocketPart: "Rocket Engine",
          introduction:
            "Captain Nova descends into the Reactor Core, where glowing symbols pulse with deep mechanical energy. These symbols control the rocket engine, but one part of the pattern is missing. Without it, the ship cannot generate the power needed for space travel. Study the sequence, find the missing symbol, and restore the reactor code. Complete the mission, and the engine will roar to life.",
          midMissionUpdate:
            "Mission Control calling! The reactor lights are flashing red, and the engine core is pulsing unevenly. If the missing symbol is not restored soon, the engine could shut down completely. Stay sharp, Explorer — the rocket’s power is hanging by a thread.",
          rewardDebrief:
            "Outstanding! The missing symbol locks into place just in time, and the reactor surges with brilliant light. The warning alarms stop, and deep below the station the rocket engine hums awake. Captain Nova grins as the power levels rise — the engine is saved.",
        },
        {
          section: "Analogies",
          number: 6,
          title: "Analogy Link",
          rocketPart: "Astronaut Seat",
          introduction:
            "Captain Nova reaches the Command Chamber, where the next lock is hidden inside a chain of connected ideas. On the main screen, two things appear linked in a special way, and a second pair waits to be completed. Only explorers who can understand the connection may unlock the reward. Solve the analogy puzzle, and the astronaut seat will be released. Then Captain Nova will finally have a place to command the mission.",
          midMissionUpdate:
            "Mission Control update! The Command Chamber does not like broken connections, and the main screen is beginning to flicker. If the idea links fail, the astronaut seat could remain trapped behind the control wall. Keep thinking carefully — one strong insight could restore the whole system.",
          rewardDebrief:
            "Brilliant thinking! The missing connection becomes clear, and the flickering screen suddenly turns bright green. A hidden platform rises from the floor, carrying the astronaut seat safely into view. Captain Nova installs it in the cockpit and regains full control of the mission.",
        },
        {
          section: "Categories",
          number: 7,
          title: "Sorting Protocol",
          rocketPart: "Launch Flames",
          introduction:
            "Captain Nova enters the Launch Grid, where objects drift through the air in glowing streams. Some belong together, but others do not, and the launch system will only activate if everything is sorted correctly. This final preparation controls the rocket’s launch flames. Choose wisely, group carefully, and clear the confusion from the grid. Complete the protocol, and the flames will ignite beneath the ship.",
          midMissionUpdate:
            "Mission Control checking in! The Launch Grid is getting crowded, and the drifting objects are beginning to cross into the wrong streams. If the sorting system jams, the launch flames may fail to ignite at all. Hurry, Explorer — the launch sequence is in danger.",
          rewardDebrief:
            "Amazing work! Just before the grid locks up, the final groups fall into the correct places. The system clears with a bright flash, and powerful launch flames burst to life beneath the rocket. Captain Nova watches the platform glow — the countdown can continue.",
        },
        {
          section: "Logic",
          number: 8,
          title: "Final Logic System",
          rocketPart: "Launch Glow",
          introduction:
            "Captain Nova enters the Final Control Room, where the last challenge protects the launch sequence itself. A chain of clues appears across the main console, and each one must be understood in the right order. This is the final test of logic, focus, and problem-solving. Solve the puzzle, and the launch system will fully awaken. Then the rocket will glow with all systems ready for liftoff.",
          midMissionUpdate:
            "Mission Control here! The final control lights are blinking on and off, and the launch sequence keeps pausing. If the last clues are not solved soon, the entire rocket may power down before liftoff. Stay calm, Explorer — this is the final test.",
          rewardDebrief:
            "Mission complete! The final clue clicks into place, and the control system roars fully awake. A brilliant launch glow spreads across the entire rocket as every system connects at once. Captain Nova climbs aboard with confidence — the ship is finally ready.",
        },
      ],
      endings: [
        {
          id: "ending_95_plus",
          label: "Legendary Launch",
          minScore: 95,
          maxScore: 100,
          text:
            "Captain Nova straps into the astronaut seat and begins the final countdown. Every rocket system responds perfectly, and the ship blasts upward with incredible power. It races past the Moon, beyond the planets, and into regions of space no explorer has ever reached before. Strange worlds, sparkling comets, and glowing galaxies fill the window. Because of your amazing skill, this mission becomes one for the history books. You did not just build a rocket — you launched a legendary adventure.",
        },
        {
          id: "ending_85_94",
          label: "Great Galactic Mission",
          minScore: 85,
          maxScore: 94,
          text:
            "The engines ignite, and the rocket lifts smoothly into the sky. Captain Nova reaches deep space and begins exploring far beyond Earth. Most systems work extremely well, though a few parts are not perfectly tuned. Because of that, the rocket cannot travel as far as its full potential. Even so, the mission is exciting, successful, and full of discovery. With a little more precision, your next rocket could go even farther into the unknown.",
        },
        {
          id: "ending_75_84",
          label: "Good Mission, Shorter Journey",
          minScore: 75,
          maxScore: 84,
          text:
            "The rocket launches strongly and climbs high above Earth. Captain Nova reaches space and sees distant planets shining through the darkness. But a few rocket systems are not working at full strength, so the ship cannot continue as far as planned. Mission Control calls Captain Nova back sooner than hoped. It is still a real space mission — but a better-built rocket could have explored much more. Next time, your answers could power an even greater journey.",
        },
        {
          id: "ending_60_74",
          label: "Partial Success",
          minScore: 60,
          maxScore: 74,
          text:
            "The rocket shakes during launch, but Captain Nova manages to guide it safely upward. For a moment, the ship reaches the edge of space, and Earth glows below like a giant blue marble. Still, several important systems struggle, and the rocket cannot keep full power for long. Mission Control orders an early return before the journey can truly begin. You helped the rocket fly, but a stronger performance would have built a much better ship. Next mission, you can aim much higher.",
        },
        {
          id: "ending_below_60",
          label: "Launch Day Setback",
          minScore: 0,
          maxScore: 59,
          text:
            "Captain Nova starts the engines, but warning lights flash across the control panel almost immediately. The rocket lifts only a short distance before unstable systems force the mission to stop. Several key parts were not strong enough for the journey ahead. Captain Nova carefully guides the ship back to the launch pad. The rocket is not ready to reach space today. But this is not the end — with better problem-solving next time, your rocket could one day soar to the stars.",
        },
      ],
    },
    gamification: {
      messages: {
        correct: [
          "Rocket power rising!",
          "Mission Control says yes!",
          "Nice work, explorer!",
          "Captain Nova is impressed!",
        ],
        gentle: [
          "Almost there, explorer!",
          "Mission Control has a hint for you.",
          "Keep building, you are doing great!",
          "The next rocket step is waiting!",
        ],
        midpoint: [
          "Star boost unlocked!",
          "Halfway through this mission!",
          "Captain Nova found extra power!",
          "Your rocket just got brighter!",
        ],
        sectionComplete: [
          "Rocket part unlocked!",
          "Mission complete!",
          "Another rocket piece clicked into place!",
          "Captain Nova is ready for the next system!",
        ],
        final: [
          "Countdown complete!",
          "The rocket is ready to launch!",
          "Captain Nova can blast off now!",
          "Adventure complete!",
        ],
      },
      midpointTitle: "Mission Control Update",
      midpointBody: "The mission is halfway complete, and Captain Nova needs one more strong push.",
      midpointReward: "Star boost unlocked",
      sectionCompleteTitle: "{reward} unlocked!",
      sectionCompleteBody: "Mission complete. Captain Nova just locked {reward} into place.",
      sectionCompleteReward: "Unlocked: {reward}",
      finalTitle: "All missions complete!",
      finalBody: "Every rocket system is in place. Captain Nova can begin the final countdown.",
      finalReward: "Rocket fully assembled",
    },
  };

  window.CaptainNovaContent = Object.freeze(content);
})();

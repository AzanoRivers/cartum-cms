export const en = {
  setup: {
    stepLabels: ['Language', 'System Check', 'Admin Account', 'Theme', 'Project', 'Initializing', 'Ready'],
    layout: {
      back: 'Back',
    },
    systemCheck: {
      title: 'System Check',
      subtitle: 'Verifying your environment before setup.',
      db:     'Database connection',
      env:    'Environment variables',
      schema:         'Schema integrity',
      storageLabel:   'Storage (R2)',
      storageWarning: 'Not configured. You can set it up later in Settings.',
      blobLabel:      'Storage (Vercel Blob)',
      blobWarning:    'Not configured. You can set it up later in Settings.',
      optimusLabel:   'Media optimization (Optimus)',
      optimusWarning: 'Not configured. Image/video compression will use client-side fallback.',
      scraperLabel:   'Web Migration (DealerScraper)',
      scraperWarning: 'Not configured. You can set it up later in Settings → Web Migration.',
      allOk:          'All systems nominal',
      continue: 'Continue',
      fixFirst: 'Fix this first',
    },
    locale: {
      title:    'Choose your language',
      subtitle: 'Select the interface language for this CMS. You can change this later in Settings.',
      continue: 'Continue',
    },
    credentials: {
      title:            'Create Admin Account',
      subtitle:         'This account will have full control over the CMS.',
      email:            'Email',
      generatedPassword: 'Generated Password',
      passwordNotice:   'Save this password. It will not be shown again.',
      regenerate:       'Regenerate',
      copy:             'Copy',
      copied:           'Copied!',
      show:             'show',
      hide:             'hide',
      continue:         'Continue',
      errors: {
        email:    'Enter a valid email address.',
        password: 'Password must be at least 12 characters.',
      },
    },
    project: {
      title:                   'Set up your Project',
      subtitle:                'Give your CMS a name. You can update this later.',
      name:                    'Project Name',
      namePlaceholder:         'My CMS',
      description:             'Description (optional)',
      descriptionPlaceholder:  'A short description of this project...',
      continue:                'Continue',
    },
    theme: {
      title:    'Choose a theme',
      subtitle: 'Pick a visual style for your dashboard. You can change this anytime in Settings.',
      continue: 'Continue',
      themes: {
        dark:       { label: 'Dark',        description: 'Night follows you across every project.' },
        cyberSoft:  { label: 'Cyber Soft',  description: 'Standard modern dark environment.' },
        light:      { label: 'Light',       description: 'Slate white. Bright environments.' },
        dusk:       { label: 'Metal',       description: 'Modern metallic blue. Elegant and cool.' },
        matrix:     { label: 'Matrix',      description: "A classic. Neo would be proud. Or would he?" },
        cyberHuman:     { label: 'Cyber Human',      description: 'Human evolution has no limits. Expand your mind.' },
        strangerThings: { label: 'Stranger Things',  description: 'Upside Down. Orange gate & acid green.' },
      },
    },
    initializing: {
      title:   'Setting things up...',
      steps: [
        'Creating admin account',
        'Setting up project',
        'Initializing schema',
        'Generating default roles',
      ],
      done: 'Done',
    },
    ready: {
      title:     'System Initialized',
      project:   'Project',
      admin:     'Admin',
      status:    'Status',
      statusVal: 'Ready',
      cta:       'Open Dashboard',
    },
  },
  auth: {
    login: {
      title:          'Sign in',
      email:          'Email',
      password:       'Password',
      show:           'show',
      hide:           'hide',
      submit:         'Sign in',
      submitting:     'Signing in...',
      error:          'Invalid email or password.',
      forgotPassword:  'Forgot password?',
      noAccount:       "Don't have an account?",
      createAccount:   'Create one',
      captchaLabel:   'Verify the sum',
      captchaPlaceholder: '?',
      captchaError:   'Incorrect answer. Try again.',
      loginSuccess:    'Welcome back!',
      accountDisabled: 'Your account is disabled. Contact your administrator.',
      emailRequired:   'Enter your email address.',
      passwordRequired:'Enter your password.',
    },
    forgotPassword: {
      title:          'Reset password',
      subtitle:       'Enter your email and we will send a reset link.',
      email:          'Email',
      submit:         'Send reset link',
      submitting:     'Sending...',
      success:        'If that email is registered, a reset link has been sent.',
      backToLogin:    'Back to login',
      noEmailWarning: 'Email delivery is not configured. Contact your administrator.',
      captchaLabel:   'Verify the sum',
      captchaPlaceholder: '?',
      captchaError:   'Incorrect answer. Try again.',
      rateLimited:    'Too many requests. Please wait 15 minutes before trying again.',
      emailRequired:  'Enter a valid email address.',
    },
    resetPassword: {
      title:           'Set new password',
      subtitle:        'Choose a strong password of at least 12 characters.',
      newPassword:     'New password',
      confirmPassword: 'Confirm password',
      submit:          'Set new password',
      submitting:      'Saving...',
      successToast:    'Password updated. You can now log in.',
      errorGeneric:    'An unexpected error occurred. Please try again.',
    },
    invite: {
      title:             "You've been invited",
      subtitle:          'to join',
      subtitleAs:        'as a',
      expired:           'This invitation has expired.',
      consumed:          'This invitation has already been used.',
      wrongAccount:      "You're signed in as {current}, but this invitation is for {expected}.",
      wrongAccountHint:  'Sign out and sign in with the correct account to accept.',
      signedInAs:        'Signed in as',
      acceptButton:      'Accept invitation →',
      accepting:         'Joining…',
      signInTitle:       'Sign in to accept this invitation',
      registerTitle:     'Create your account to join',
      passwordLabel:     'Password',
      passwordPlaceholder: 'At least 8 characters',
      passwordShow:      'Show',
      passwordHide:      'Hide',
      passwordRegenerate: 'Regenerate',
      passwordCopy:      'Copy',
      passwordCopied:    'Copied',
      passwordNotice:    'Save this password. You will need it to sign in later.',
      createButton:      'Create account and join →',
      creating:          'Creating account…',
      emailLabel:        'Email',
      signInButton:      'Sign in and join →',
      signingIn:         'Joining…',
      goToLogin:         'Go to sign in',
      roleLabels:        { admin: 'Admin', editor: 'Editor', viewer: 'Viewer', restricted: 'Restricted' },
    },
  },
  cms: {
    topBar: {
      account:           'Account',
      logOut:            'Log out',
      userMenuAriaLabel: 'User menu',
      freeTier:          'Free Tier',
      trialDaysLeft:     '{n}d left',
      trialTooltip:      'CartumCMS subscription time',
    },
    projectSelector: {
      newProject:  'New board',
      ariaLabel:   'Select project',
    },
    noProject: {
      title:    'No active project',
      desc:     'You were removed from your project. Create a new board to continue using the CMS.',
      button:   'Create new board',
    },
    newProjectModal: {
      title:                  'New project',
      nameLabel:              'Project name',
      namePlaceholder:        'My project',
      descriptionLabel:       'Description (optional)',
      descriptionPlaceholder: 'What is this project about?',
      localeLabel:            'Language',
      localeEn:               'English',
      localeEs:               'Spanish',
      cancel:                 'Cancel',
      create:                 'Create →',
      creating:               'Creating…',
      next:                   'Next →',
      back:                   '← Back',
      step1:                  'Step 1 of 2',
      step2:                  'Step 2 of 2',
      themeLabel:             'Choose a theme for your board',
    },
    player: {
      welcome:             'Welcome to the Poker table of CMS platforms. Fill in the details below to create your account and claim your seat at the table.',
      langSelect:          'Language',
      createAccountTab:    'Create your Account',
      stepCredentials:     'Your credentials',
      stepProject:         'Your project',
      stepTheme:           'Your theme',
      emailLabel:          'Email',
      emailPlaceholder:    'you@example.com',
      passwordLabel:       'Password',
      passwordPlaceholder: 'At least 8 characters',
      generatePassword:    'Generate',
      copyPassword:        'Copy',
      copiedPassword:      'Copied!',
      projectLabel:           'Project name',
      projectPlaceholder:     'My project',
      descriptionLabel:       'Description (optional)',
      descriptionPlaceholder: 'A short description of your project',
      projectLocaleLabel:     'Project language',
      themeLabel:             'Interface theme',
      themes: {
        dark:           'Dark',
        'cyber-soft':   'Cyber Soft',
        light:          'Light',
        dusk:           'Dusk',
        matrix:         'Matrix',
        'cyber-human':      'Cyber Human',
        'stranger-things':  'Stranger Things',
      },
      next:                'Next →',
      submit:              'Get started →',
      submitting:          'Creating account…',
      back:                '← Back',
      showPassword:        'Show',
      hidePassword:        'Hide',
      alreadyHaveAccount:  'Already have an account?',
      signIn:              'Sign in',
      disabled:            'Registration is currently closed.',
    },
    dock: {
      settings:      'Settings',
      home:          'Home',
      content:       'Content',
      create:        'Create deck',
      backToBuilder: 'Back to Builder',
      help:          'Help & Shortcuts',
      collapse:      'Collapse dock',
      expand:        'Expand dock',
    },
    help: {
      title:              'Help',
      shortcutsTitle:     'Keyboard Shortcuts',
      gesturesTitle:      'Touch Gestures',
      boardTitle:         'Board Interactions',
      close:              'Close',
      categoryNav:        'Navigation',
      categoryPanels:     'Panels',
      categoryGestures:   'Board',
      shortcuts: {
        goHome:       { keys: 'G → H', description: 'Go to Board' },
        goContent:    { keys: 'G → C', description: 'Go to Content' },
        newNode:      { keys: 'G → N', description: 'Create new deck' },
        openSettings: { keys: 'G → ,', description: 'Open Settings' },
        closeOverlay: { keys: 'Esc',   description: 'Close any open panel' },
      },
      gestures: {
        singleTap:   { icon: '1x', description: 'Tap once: select the deck and reveal its connection ports' },
        doubleTap:   { icon: '2x', description: 'Tap twice: open the deck or edit an attribute' },
        longPress:   { icon: '⏱',  description: 'Hold and move: drag the deck to reposition it' },
        portDrag:    { icon: '⊙',  description: 'Tap a port dot, then drag to draw a connection' },
        pinch:       { icon: '⟺',  description: 'Two-finger pinch: zoom in or out' },
        panCanvas:   { icon: '↕',  description: 'Drag on empty space: pan the canvas' },
      },
      board: {
        pan:       { icon: '↔',  description: 'Left-drag on empty space: pan the canvas' },
        marquee:   { icon: '▭',  description: 'Right-drag on empty space: area selection' },
        multiAdd:  { icon: '⊕',  description: 'Ctrl + click: add a deck or card to the selection' },
        multiMove: { icon: '⤢',  description: 'Drag any selected item: move the whole group' },
        multiDel:  { icon: '⌦',  description: 'Right-click a selected item: open delete menu' },
        multiEsc:  { icon: '⎋',  description: 'Esc: clear the current selection' },
      },
      docsButton: 'Documentation',
    },
    docs: {
      title:     'Docs',
      breadcrumb: 'Docs',
      sidebarAriaLabel: 'Documentation navigation',
      sections: {
        gettingStarted: 'Getting Started',
        navigation:     'Navigation',
        nodesAndFields: 'Decks & Cards',
        content:        'Content',
        webMigration:   'Web Migration',
        relationsGuide: 'Relations',
        rolesGuide:     'Roles & Access',
        media:          'Media & Storage',
        apiForDevs:     'API for Developers',
        apiSchema:      'API: Table Discovery',
        relations:          'Node Relations',
        nodesAndFieldsDev:  'Nodes & Fields',
        usersGuide:         'Users & Roles',
        emailSetup:         'Email Setup',
        webMigrationDev:    'Web Migration',
        multiProject:       'Multi-Project',
        multiProjectDev:    'Multi-Project',
        storageSetup:       'Storage Setup',
        installation:       'Installation',
        importExport:       'Import & Export',
      },
      userBadge: 'User Docs',
      devBadge:  'Developer',
      gettingStarted: {
        title:         'Getting Started',
        welcome:       'Hello. Thank you for your interest in Cartum CMS. This is a content and database manager designed to be used as a headless CMS. There are many CMS solutions out there, but most have a steep learning curve for both end users and developers. Cartum is built so that databases and REST APIs can be set up quickly and intuitively, under the idea of an infinite poker table. This project is designed to be used fast and easily in any type of project that needs a security layer, an API, and a content editing interface that is comfortable to use. I hope it helps you. — AzanoRivers',
        intro:         'Cartum is a serverless-first headless CMS with visual data modeling.',
        conceptsTitle: 'Core concepts',
        concepts: {
          node:       'Deck: a group of cards of the same type',
          field:      'Attribute: a piece of data on each card (text, number, toggle, image...)',
          record:     'Card: a single entry in a deck',
          connection: 'Link: a connection between two decks',
        },
        flowTitle:   'Basic workflow',
        flow:        'Create a deck, add attributes, go to Content, add cards',
        installLink: 'Want to install Cartum using npm or pnpm? Check the installation guide:',
      },
      navigation: {
        title:          'Navigation',
        dockTitle:      'DockBar',
        dockDesc:       'The icon sidebar on the left: Home (board), Content, Create deck, Settings, Help.',
        boardLabel:     'Board',
        boardDesc:      'Infinite visual canvas of decks and links.',
        contentLabel:   'Content',
        contentDesc:    'Card list per deck.',
        shortcutsTitle: 'Keyboard shortcuts (desktop)',
        shortcuts: {
          goHome:       'Go to Board',
          goContent:    'Go to Content',
          newNode:      'Create new deck',
          openSettings: 'Open Settings',
          closeOverlay: 'Close any open panel',
        },
        gesturesTitle: 'Touch gestures (mobile)',
        gestures: {
          singleTap: 'Tap once: select the deck and show ports',
          doubleTap: 'Tap twice: open the deck',
          longPress:  'Hold and drag: move the deck',
          pinch:      'Two-finger pinch: zoom',
          pan:        'Drag on empty space: pan',
        },
      },
      nodesAndFields: {
        title:        'Decks & Cards',
        deckTitle:    'Create a deck',
        deckDesc:     'A deck holds cards of the same type. Click + in the dock → Container → give it a name. That deck appears on the board, ready to receive cards.',
        cardAttrTitle: 'Card attributes',
        cardAttrDesc:  'Every card in a deck shares the same attributes - the pieces of information you define. Double-click a deck → click + inside → choose a type → enter a name.',
        attrTypesTitle: 'Attribute types',
        attrTypes: {
          text:     'Text - a name, description, or any written content.',
          number:   'Number - a price, quantity, rating, or any numeric value.',
          toggle:   'Toggle - a yes / no switch (e.g. published, featured).',
          image:    'Image - a single photo or illustration.',
          video:    'Video - a clip uploaded and compressed automatically.',
          gallery:  'Gallery - a collection of images.',
          relation: 'Link - points to a card in another deck.',
        },
        note: 'The order you add attributes is the order they appear when editing a card. You can rearrange them at any time.',
      },
      nodesAndFieldsDev: {
        title:      'Nodes & Fields',
        intro:      'A node maps to a PostgreSQL table. Records are stored as JSONB payloads. Each node gets a slug derived from its name, which becomes the route segment in the REST API (/api/v1/{slug}).',
        nodeTitle:  'Node',
        nodeDesc:   'Name → auto-slugified (spaces → hyphens, lowercased). The slug is immutable once the first record is created. System fields added automatically: id (UUID v4), createdAt, updatedAt.',
        fieldTitle: 'Field',
        fieldDesc:  'A field defines a typed key in the JSONB payload. The field name is slugified to camelCase and becomes the JSON key in API responses. Renaming a field changes its key - update API consumers accordingly.',
        fieldNamingTitle: 'Field naming',
        fieldNamingDesc:  'Use camelCase (e.g. blogPost, maxWidth). Spaces are auto-converted. Avoid reserved names: id, createdAt, updatedAt.',
        fieldTypesTitle:  'Field types',
        fieldTypes: {
          text:     'text - string. Options: multiline (textarea), maxLength (integer).',
          number:   'number - float. Options: integer-only flag, min / max range.',
          boolean:  'boolean - Options: custom true/false labels, default value.',
          image:    'image - { key, url }. Uploaded to R2, compressed to WebP via Optimus VPS.',
          video:    'video - { key, url, mimeType, sizeBytes }. Chunked upload → VPS MP4 compression → R2.',
          gallery:  'gallery - Array<{ key, url }>. Configurable max items.',
          relation: 'relation - UUID string. FK to a record in the target node. Expanded via ?include= in the API.',
        },
        requiredTitle: 'Required flag',
        requiredDesc:  'Enforced at record create / update via the REST API and the CMS editor. Application-layer validation - no database-level NOT NULL constraint.',
        note:          'No schema migration on field rename or delete. Existing records retain the old key in their JSONB payload until re-saved. Plan field names before creating records in production.',
      },
      importExport: {
        title: 'Import & Export',
        intro: 'Cartum has two separate scopes for backup and restore: project-level (available to admins and super admins) and instance-level (super admin only). Both operations are found in Settings → Database and Settings → Super DB respectively.',

        projectTitle: 'Project Export / Import',
        projectDesc:  'Exports and imports only the content of the active project: decks (nodes), cards (field definitions), links (node relations), records, and media metadata. User accounts, roles, and CMS settings are not included.',

        exportTitle:  'Exporting a project',
        exportSteps: {
          s1: 'Go to Settings → Database → Export project.',
          s2: 'Download the .json file (or .zip with media files).',
          s3: 'The file contains: nodes, fieldMeta, nodeRelations, records, media.',
          s4: 'Media files themselves remain in your storage provider (R2 or Blob). The export includes their keys and public URLs so they remain accessible after restore.',
        },

        importTitle:  'Importing a project',
        importDesc:   'Importing completely replaces the current project\'s content with the backup. All existing decks, records, and media metadata for the project are deleted before restore.',
        importSteps: {
          s1: 'Go to Settings → Database → Import project.',
          s2: 'Select a .json file previously exported from Cartum (type: "cartum-project").',
          s3: 'Original IDs are preserved — relation field values in records remain valid after restore.',
          s4: 'Node slugs are preserved when possible. If a slug conflicts with another project on the same instance, it is nulled (the slug can be reassigned manually).',
          s5: 'Media records are re-attributed to the importing user. The physical files in storage are not touched.',
        },
        importWarnTitle: 'Warning',
        importWarn:      'This operation is irreversible. The current project content is permanently deleted before inserting the backup data. Export first if you need a copy of the current state.',

        superTitle: 'Super Export / Import (super_admin only)',
        superDesc:  'Full instance backup: all projects, all users, roles, memberships, app settings, and media metadata. Found in Settings → Super DB.',

        superExportTitle: 'Super Export',
        superExportSteps: {
          s1: 'Available only to the super_admin (the account created during setup).',
          s2: 'Exports every table: project, users, roles, usersRoles, projectMemberships, projectInvitations, apiTokens, appSettings, projectSettings, roleSectionPermissions, nodes, fieldMeta, nodeRelations, records, media, rolePermissions.',
          s3: 'The .json file is version-tagged (v1.4) and contains all credentials stored in app_settings (R2 keys, email keys, etc.). Treat this file as highly sensitive.',
          s4: 'The .zip variant downloads the JSON backup plus all media files from all projects.',
        },

        superImportTitle: 'Super Import',
        superImportSteps: {
          s1: 'Wipes the entire database before restoring: all users, projects, nodes, records, media, and settings.',
          s2: 'Insertion order follows FK constraints: project → roles → users → memberships → invitations → tokens → nodes → content → settings.',
          s3: 'After import the session is invalidated. Log in again with the restored credentials.',
        },
        superImportWarn: 'Super Import erases EVERYTHING in the instance and cannot be undone. Only use a backup file generated by Super Export from the same or a compatible Cartum version.',

        mediaNote:  'Media files are stored externally (Cloudflare R2 or Vercel Blob). Exports only contain metadata (key, publicUrl, mimeType). The actual files are not included in any backup. If you migrate to a new storage provider, you must also migrate the files independently.',

        formatTitle: 'Backup file formats',
        formatProject: '"type": "cartum-project", "version": "1.0" — project-scope backup produced by export project.',
        formatSuper:   '"version": "1.4" (no type field) — full-instance backup produced by super export.',
      },
      content: {
        title:          'Content Editing',
        step1:          'Go to Content from the dock.',
        step2:          'Select a deck.',
        newRecord:      'New Card: add a new card with all the deck attributes.',
        editRecord:     'Edit Card: update an existing card.',
        deleteRecord:   'Delete Card: remove with confirmation.',
        validationNote: 'Validation: required attributes and number ranges are enforced.',
        mediaNote:      'Image/video attributes: upload a file or select from the Media Library.',
      },
      webMigration: {
        title:   'Web Migration',
        intro:   'Web Migration lets you import content from any existing website directly into Cartum. Instead of building your content structure from scratch, you point Cartum at a URL and it collects text, images and videos automatically, then recreates them as Decks and Cards.',
        howTitle: 'How it works',
        howItems: {
          a: 'Cartum runs a smart crawl that follows every internal link on the target site.',
          b: 'It captures text, images and videos from each page it visits.',
          c: 'An AI model then analyzes the collected data and maps it into Decks and Cards.',
          d: 'You review the suggested structure, adjust if needed, and confirm the import.',
        },
        whatYouGetTitle: 'What you get',
        whatYouGetItems: {
          a: 'A Deck structure that mirrors the original site content organization.',
          b: 'Images and videos attached to the right cards.',
          c: 'A ready-to-review import you can accept, edit or discard.',
        },
        aiNote:      'The AI step is what makes the difference. Without it you get raw extracted data. With it you get a clean, structured schema tailored to Cartum.',
        bestForTitle: 'Works best on',
        bestForItems: {
          a: 'Online stores and product catalogs.',
          b: 'Portfolios and agency sites.',
          c: 'Directories, listings and blogs.',
        },
        startTitle: 'Getting started',
        startDesc:  'Open Settings, go to Web Migration, and configure your Dealer Scraper connection. Once set up, a migration option will be available from the Content view.',
        accuracyWarning: 'Extracted data is not 100% accurate. AI models can miss content, mislabel images or misinterpret a site structure. The goal of this tool is to give you a starting point based on the original site so you do not have to build from scratch. Always review and adjust the result before confirming the import.',
      },
      relationsGuide: {
        title:        'Relations',
        intro:        'The Cartum board is like a poker table: you can place as many decks on it as you need. Each deck is a node, and each card inside a deck is a record. Relations are the thread that connects a card in one deck to a card in another.',
        whatTitle:    'What is a deck and what is a card?',
        whatDesc:     'A deck groups cards of the same type. If you run a music business, you might have an Artists deck and an Albums deck. Each card in Artists represents one artist (name, photo, genre). Each card in Albums represents one album (title, year, cover). Without a relation, both decks sit separately on the table - their cards know nothing about each other.',
        whyTitle:     'Why would I connect them?',
        whyItems: {
          a: 'Albums → Artists: each album knows who recorded it.',
          b: 'Products → Categories: each product knows which category it belongs to.',
          c: 'Orders → Customer and → Product at the same time: one card can point to several decks simultaneously.',
        },
        exampleTitle: 'The play: linking Albums to Artists',
        exampleDesc:  'Open the Albums deck on the board and add a Relation field called "artist". A thread appears on that field - drag it to the Artists deck and drop. The line is drawn on the table. Now when you edit the "Thriller" card, you see a picker to choose "Michael Jackson" from your Artists deck. Save - and that card knows its artist. If you later fix the spelling of "Michael Jackson" in the Artists deck, the change is reflected in every album that references him, without touching anything else.',
        howTitle:     'How do I create a relation?',
        how1:         'On the board, open the deck you want to connect from (e.g. Albums).',
        how2:         'Add a new field and choose the type Relation.',
        how3:         'Drag the thread that appears on that field to the target deck (e.g. Artists) and drop. The connection is ready.',
        contentTitle: 'How do I use it when editing content?',
        contentDesc:  'When you open a card that has a relation field, you\'ll see a picker to choose a card from the linked deck. Select it and save. No database knowledge required - it works just like filling in any other field.',
        note:         'A relation never duplicates cards: it only stores a link. If you change a card in the target deck, the change appears automatically in every card that references it.',
      },
      rolesGuide: {
        title: 'Roles and Access',
        intro: 'Every user who accesses a board does so under a role. Roles determine what they can see and do, and they are always scoped to a specific project. The same person can be an Admin in one project and a Viewer in another.',
        defaultRolesTitle: 'The four default roles',
        roles: {
          admin: {
            name: 'Admin',
            desc: 'Has full access to all decks and cards in the project. Can manage members, configure settings, create and delete decks, and edit all records. When you create a new project, you automatically become its Admin.',
          },
          editor: {
            name: 'Editor',
            desc: 'Sees every deck and card in the project and can create, edit and delete records. Cannot access project settings or invite other members. Ideal for team members who need to manage content without touching the project structure.',
          },
          viewer: {
            name: 'Viewer (Lector)',
            desc: 'Sees every deck and card in the project in read-only mode. Cannot create, edit or delete records. Cannot access settings. Ideal for stakeholders or clients who need visibility without the ability to change data.',
          },
          restricted: {
            name: 'Restricted',
            desc: 'A global suspension applied by a super admin. A restricted user cannot log in to the CMS at all, regardless of which project they belong to. It is not a project role: it is a system-level block.',
          },
        },
        projectScopeTitle: 'Roles are per project',
        projectScopeDesc:  'A role only applies inside the project where it was granted. If a user switches to a different project, the CMS reads the role they hold in that project and applies those restrictions immediately. There is no global role that follows the user across all projects, except for the super admin.',
        newProjectTitle:   'Creating a project makes you Admin',
        newProjectDesc:    'Any user who creates a new project is automatically assigned the Admin role for that project. From that moment they have full control: they can configure the board, invite other members and assign them a role, manage decks and records, and access all project settings.',
        inviteTitle:       'Inviting someone to your project',
        inviteDesc:        'Admins can invite users to a project from Settings, Members section. The invited person receives a link, creates their account if they do not have one, and joins the project with the role chosen at the time of invitation. Their role can be changed at any time from the Members section.',
        superAdminTitle:   'Super admin',
        superAdminDesc:    'The super admin is a special account created during the initial setup. It has unrestricted access to every project on the instance, can manage global users, configure instance-level variables, and perform operations that no project admin can carry out, such as resetting the CMS or managing subscriptions.',
        switchNote:        'When you switch to a project where your role is Viewer, the board becomes read-only immediately. Switch back to a project where you are Admin and full access is restored. The interface adapts without requiring a logout.',
      },
      webMigrationDev: {
        title: 'Web Migration: Technical Details',
        intro: 'The Web Migration feature is powered by Cartum\'s own crawling service, Dealer Scraper. It runs as a standalone Python service on a VPS and exposes a REST API that the CMS calls to start and monitor migration jobs.',
        crawlTitle: 'Crawling, not typical scraping',
        crawlDesc:  'Dealer Scraper does not scrape individual elements by CSS selector. It first discovers all internal URLs via robots.txt, sitemaps and homepage links, then fetches each page with async HTTP requests (httpx) and extracts structured content using BeautifulSoup and readability-lxml. Because it uses standard HTTP rather than a headless browser, it works on server-rendered sites but does not execute JavaScript.',
        pipelineTitle: 'Pipeline stages',
        pipelineItems: {
          nav:     'Route discovery (Explorer): checks robots.txt, sitemaps and homepage links to build the full list of internal URLs to visit.',
          fetch:   'Page download (Fetcher): fetches each URL with async HTTP, with retry and exponential backoff. Non-retriable codes (404, 410) are skipped.',
          extract: 'Content extraction (Extractor): parses each HTML file with BeautifulSoup and readability-lxml to extract title, metadata, Open Graph tags, text content, images (srcset, lazy-load, background-image) and video sources.',
          catalog: 'Image cataloguing (Image Crawler): deduplicates media across all pages and assigns a semantic role (hero, thumbnail, logo, background, gallery) based on frequency and context.',
          audit:   'Coverage audit (Auditor): checks what percentage of discovered routes were successfully extracted. Can trigger a second-pass fetch for missed pages.',
          ai:      'AI review (Reviewer): sends extracted page data and the image catalogue to a configurable LLM provider, which returns a structured schema mapping everything to Cartum Decks and Cards.',
          import:  'Import: the CMS receives the structured schema for review, adjustment and confirmation before writing to the database.',
        },
        stackTitle: 'Python stack',
        stackItems: {
          a: 'FastAPI for the REST service layer.',
          b: 'httpx for async HTTP page fetching with retry and backoff.',
          c: 'BeautifulSoup and readability-lxml for HTML parsing and content extraction.',
          d: 'Custom LLM client (no SDK) supporting OpenAI, Anthropic, NVIDIA, Deepseek and Minimax via direct HTTP calls.',
        },
        configTitle: 'Configuration',
        configDesc:  'Set the VPS API URL, bearer token and target AI model in Settings > Web Migration. The CMS passes those values on every job request.',
        aiNote:      'The AI review step is optional but strongly recommended. It transforms raw crawl data into a clean, ready-to-import Cartum schema. Without it the import contains unstructured page content.',
        accuracyWarning: 'The extracted data is not guaranteed to be complete or accurate. AI models can miss content, misclassify images or misread a site layout. The purpose of this tool is to provide a structural starting point based on the target site, not a perfect replica. Treat the import result as a draft and review it carefully before confirming.',
        officialDocsTitle: 'Official Documentation',
        officialDocsDesc:  'Full setup guide, API reference and configuration options for Dealer Scraper.',
        officialDocsLink:  'View Dealer Scraper docs',
        officialDocsUrl:   'https://www.azanolabs.com/cartum/dealer-scraper',
      },
      media: {
        title:         'Media & Storage',
        galleryTitle:  'Media Gallery',
        galleryDesc:   'View all uploaded files at /cms/content/media. Filter by type, search by name, bulk download or delete.',
        optimTitle:    'Automatic optimization',
        optimImages:   'Images: client-side compression + Optimus VPS (WebP output).',
        optimVideos:   'Videos: chunked upload → VPS compression → MP4 saved to R2.',
        optimFallback: 'If VPS is not configured or fails, the original file is uploaded.',
        limitsTitle:   'Limits',
        limitImages:   'Images: max 10 MB',
        limitVideos:   'Videos: max 500 MB (warning above 100 MB)',
        configNote:    'Configure storage at Settings → Storage (R2 + Optimus VPS URL and API key).',
        vpsTitle:      'Direct VPS upload',
        vpsIntro:      'When MEDIA_VPS_URL and MEDIA_VPS_KEY are set, the browser sends media bytes directly to the VPS - no Vercel bandwidth is consumed.',
        vpsItem1:      'A 2-hour session token is fetched from Vercel on page load and auto-renewed in the background before it expires.',
        vpsItem2:      'Images: the compression call goes directly to the VPS using X-Session-Token.',
        vpsItem3:      'Videos: init, chunks, finalize and status polling all go directly to the VPS.',
        vpsItem4:      'Video final step (VPS → R2 save) still runs on Vercel - it requires server-side credentials.',
        vpsTtlNote:    'Token lifetime (default 2 h) is configured on the VPS at app/core/security.py → _SESSION_TTL.',
        storageTitle:       'Storage Providers',
        storageIntro:       'Cartum supports two storage providers: Cloudflare R2 and Vercel Blob. Configure them at Settings → Storage.',
        storageR2:          'Cloudflare R2: the browser uploads directly to R2 via a presigned URL, bytes never pass through Vercel.',
        storageBlob:        'Vercel Blob: uploads go through a Server Action on Vercel. Simpler to set up, no Cloudflare account needed.',
        storageSwitchTitle: 'Switching providers',
        storageSwitch:      'Go to Settings → Storage. If both providers are configured, a selector appears at the top. The active provider applies to new uploads only, existing files are not migrated.',
        storageBackcompat:  'Files already uploaded keep their original provider regardless of the active setting. Existing URLs always work.',
        storageVideoLimitsTitle: 'Video limits by provider',
        storageVideoLimitsBlob:  'Vercel Blob without VPS: 50 MB per video (fixed Vercel Server Action limit). The upload is rejected before entering the queue if the file exceeds this limit.',
        storageVideoLimitsR2:    'Cloudflare R2 or Blob with VPS: up to 500 MB. The VPS optimizer compresses the video before storage, the 50 MB limit does not apply.',
      },
      apiForDevs: {
        title:        'API for Developers',
        intro:        'The public API exposes record data and deck schemas. Board canvas positions are internal-only.',
        tokenTitle:   'Create an API Token',
        tokenStep1:   'Go to Settings → API Tokens.',
        tokenStep2:   'Enter a descriptive name (e.g. Frontend App).',
        tokenStep3:   'Select a Role (defines per-deck permissions).',
        tokenStep4:   'Choose the scope: read, write, update, and/or delete.',
        tokenStep5:   'Optionally exclude specific decks from this token.',
        tokenStep6:   'Copy the token. It is shown only once.',
        authTitle:    'Authentication',
        authNote:     'All endpoints require this header. Without it: 401 UNAUTHORIZED.',
        baseUrlTitle: 'Base URL',
        deckSlugTitle:'What is {deckSlug}?',
        deckSlugDesc: 'The slug of a deck you created on the board. There are no predefined models: you define the structure. The slug is derived from the deck name (e.g. "Blog Posts" into "blog-posts").',
        scopeTitle:   'Token scope',
        scopeDesc:    'Each token carries a set of allowed actions. The required scope per endpoint is shown in the Permission column.',
        endpointsTitle: 'Available endpoints',
        endpoints: {
          schema:        'List all decks with their cards (fields) and nested decks',
          getSchemaDeck: 'Get the schema for a single deck by UUID',
          getDeck:       'Get deck metadata by UUID',
          getCard:       'Get card (field) metadata by UUID',
          listRecords:   'List records in a deck (paginated)',
          getRecord:     'Get a single record by UUID',
          createRecord:  'Add a new record to a deck',
          putRecord:     'Replace all fields of a record',
          patchRecord:   'Partially update a record (merge)',
          deleteRecord:  'Delete a record',
        },
        endpointPermissions: {
          anyToken: 'any valid token',
          read:     'read',
          write:    'write',
          update:   'update',
          delete:   'delete',
        },
        putVsPatchNote:   'PUT replaces the entire data object. PATCH merges with existing data. Omitted fields are preserved.',
        canvasNote:       'Deck positions on the board canvas are not exposed. They are internal CMS configuration.',
        queryParamsTitle: 'Query parameters (GET list)',
        params: {
          page:    { name: 'page',              type: 'number',   default: '1',            desc: 'Current page' },
          limit:   { name: 'limit',             type: 'number',   default: '20 (max 100)', desc: 'Items per page' },
          sort:    { name: 'sort',              type: 'string',   default: 'created_at',   desc: 'Field to sort by' },
          order:   { name: 'order',             type: 'asc|desc', default: 'desc',         desc: 'Sort direction' },
          filter:  { name: 'filter[fieldName]', type: 'string',   default: '-',            desc: 'Filter by exact field value (e.g. filter[featured]=true). Multiple filters are ANDed.' },
          include: { name: 'include',           type: 'string',   default: '-',            desc: 'Comma-separated relation fields to expand (e.g. author,category). UUID replaced by the full linked record.' },
        },
        responseListTitle:   'Successful response: list',
        responseRecordTitle: 'Successful response: single record',
        includeTitle:        'Relation expansion (include)',
        includeDesc:         'Relation cards store the linked record UUID. With ?include=fieldName the UUID is replaced by the full linked record (one level deep).',
        errorsTitle:         'Error codes',
        errors: {
          badRequest:   { code: '400', name: 'BAD_REQUEST',      desc: 'Invalid JSON in request body' },
          unauthorized: { code: '401', name: 'UNAUTHORIZED',     desc: 'Missing, invalid, revoked, or expired token' },
          forbidden:    { code: '403', name: 'FORBIDDEN',        desc: 'Token scope does not allow this action, or the deck is excluded by token policy' },
          notFound:     { code: '404', name: 'NOT_FOUND',        desc: 'Deck slug or record UUID not found' },
          validation:   { code: '422', name: 'VALIDATION_ERROR', desc: 'Invalid data (required card, out of range, etc.)' },
          noContent:    { code: '204', name: 'n/a',              desc: 'DELETE successful (no response body)' },
        },
        examplesTitle: 'cURL examples',
        examplesNote:  'Examples use a deck called "products" with cards: name (text), price (number), featured (boolean).',
      },
      apiSchema: {
        title:            'API: Table Discovery',
        intro:            'Before consuming data, discover which decks are on the table and what cards (fields) they contain, without opening the CMS.',
        endpointLabel:    'Endpoint',
        anyTokenNote:     'Any valid token can access this endpoint. No scope or per-deck permission required.',
        responseTitle:    'Response',
        fieldsTableTitle: 'Fields in each card object',
        fields: {
          id:           { name: 'id',           type: 'string',  desc: 'Card UUID' },
          name:         { name: 'name',         type: 'string',  desc: 'Card name' },
          type:         { name: 'type',         type: 'string',  desc: 'Type: text, number, boolean, image, video, gallery, relation' },
          required:     { name: 'required',     type: 'boolean', desc: 'Whether the card is required when creating/updating a record' },
          defaultValue: { name: 'defaultValue', type: 'string',  desc: '(optional) Configured default value' },
          relatesTo:    { name: 'relatesTo',    type: 'string',  desc: '(relation cards only) Slug of the linked deck' },
        },
        exampleLabel: 'cURL example',
      },
      relations: {
        title: 'Node Relations',
        intro: 'When nodes are connected in the board, the API automatically merges their schemas. Fields from related nodes appear flat in the response - no nesting, no extra requests.',
        flatPrincipleTitle: 'Flat response principle',
        flatPrincipleDesc:  'Every node always returns two keys: fields (all inherited fields merged flat) and containers (shallow references). Containers never expose their own content inline - fetch them separately by id.',
        inheritanceTitle:   'Structural inheritance (parent → child)',
        inheritanceDesc:    'A child node (nested inside a parent container) automatically sees all fields and containers from its direct parent. The parent itself is excluded from the list to avoid self-reference. Inheritance is one level deep only.',
        relationTypesTitle: 'Relation types',
        types: {
          oneToOne: {
            label: '1:1  -  One to One',
            desc:  'Both nodes share each other\'s own direct fields. Non-transitive: if A↔B and B↔C, then A does not see C\'s fields.',
          },
          oneToMany: {
            label: '1:n  -  One to Many',
            desc:  'The source node injects its own direct fields into the target node and into every node reachable from the target via 1:1 chains. The source does not receive anything back.',
          },
          manyToMany: {
            label: 'n:m  -  Many to Many',
            desc:  'Both nodes share each other\'s fully resolved content (including all their own inherited fields). Child nodes of each side also inherit this via structural inheritance.',
          },
        },
        multipleRelationsTitle: 'Multiple relations',
        multipleRelationsDesc:  'A node can have multiple relations of different types simultaneously. The result is the deduplicated union of all inherited fields and containers.',
        antiCycleTitle: 'Anti-cycle protection',
        antiCycleDesc:  'The resolver tracks visited nodes per request. Circular relations (A↔B↔A) resolve safely without infinite loops.',
        consumingTitle: 'How to consume',
        consumingSteps: {
          step1: 'Call GET /api/v1/table to get all root decks with their merged cards and nested deck references.',
          step2: 'Use the cards array directly, it already contains everything the deck inherits.',
          step3: 'For each item in decks, call GET /api/v1/table/{deckId} to get its merged cards separately.',
          step4: 'Never expect nested content inside decks. They are always shallow references.',
        },
        exampleTitle: 'Response example',
        exampleNote:  'Blog Posts has a 1:1 relation with SEO node. The fields from SEO appear flat inside Blog Posts.',
      },
      multiProject: {
        title:        'Multi-Project',
        intro:        'In Cartum, each project is a separate poker table. Same hall, different game. Everything that lives on a table (decks, cards, links, settings, API tokens) belongs exclusively to that table and has no contact with the others.',
        tableTitle:   'What is a project?',
        tableDesc:    'A project is an independent table. It has its own decks, its own cards and its own players. Nothing crosses between tables: what happens at one table stays at that table. You can run as many tables at the same time as you need, and each one works completely on its own.',
        switchTitle:  'Switching tables',
        switchDesc:   'The project selector at the top of the CMS shows which table you are currently playing at. Click it to see all your tables and switch to a different one. The entire board (decks, cards, settings and API tokens) changes instantly to the one you selected.',
        newTableTitle: 'Opening a new table',
        newTableDesc:  'Click "New project" in the selector. Give the table a name, an optional description, and choose the language the CMS should use for that table. The new table opens with a clean board, ready to play.',
        playersTitle: 'Players (users)',
        playersDesc:  'Every table has its own players. Players are the users who can see and edit content on that table. The person who set up Cartum is the super admin, who can sit at any table, create new tables, and manage everything. Regular players are invited to specific tables and can only see and do what they are allowed within those tables.',
        languageTitle: 'Table language',
        languageDesc:  'Each table has its own language setting. When you switch to a table, the entire CMS (menus, labels, help texts) shows in that table\'s language. You can change it at any time in that table\'s settings.',
        note:          'Content and settings are private to each table. Opening a new table always starts clean: no decks, no cards, no links to other tables.',
      },
      multiProjectDev: {
        title: 'Multi-Project: Technical Details',
        intro: 'Each project is a fully isolated capsule in the database. Nodes, field metadata, records, role permissions and media assets all belong to a single project. Users and global infra (app settings, env-level API keys) are shared across all projects.',
        capsuleTitle: 'Capsule architecture',
        capsuleDesc:  'One `project` row per project, linked to its own `nodes`, `field_meta`, `records`, `role_permissions`, `media` and `project_memberships`. Cross-project queries are blocked at the service layer, every query filters by `projectId`.',
        sessionTitle: 'Session context',
        sessionDesc:  '`currentProjectId` is stored in the Auth.js JWT. Every Server Action and service call reads it from the session to scope DB queries. Switching projects calls `switchProject(id)`, which validates membership, updates `currentProjectId` in the session and redirects to `/cms/board`.',
        localeTitle: 'Project locale',
        localeDesc:  'Each project has a `defaultLocale` (en | es). The `getCurrentLocale()` helper reads `currentProjectId` from the session and returns the active project\'s locale. All page routes use this helper for `generateMetadata` and dictionary selection. Switching projects changes the entire CMS language on the next navigation.',
        superAdminTitle: 'Super admin',
        superAdminItems: {
          one:    'Exactly one per system, `isSuperAdmin: true` on the `users` row.',
          apiKey: 'Can view raw API key values in Settings. All other roles see masked values only.',
          blob:   'Can configure Vercel Blob storage. Regular admins have access to Cloudflare R2 only.',
          access: 'Has access to all projects regardless of `projectMemberships` rows.',
          delete: 'Cannot be deleted, a Postgres trigger blocks DELETE on the `users` table.',
        },
        regularAdminTitle: 'Regular admins (new players)',
        regularAdminItems: {
          role:    'Users registered via `/cartum-player` receive the `admin` role automatically.',
          storage: 'Can configure Cloudflare R2 only. The Vercel Blob option is hidden in Settings.',
          apiKey:  'See API keys masked. Can rotate (edit) or revoke tokens they have permission for, but cannot view raw values.',
          scope:   'Scoped to the projects they are members of. No cross-project access.',
        },
        apiKeysTitle: 'API key visibility',
        apiKeysDesc:  'Token values are shown in full once at creation time. In the token list, raw values are visible only to the super admin. All other roles see a masked representation. Any user with the right permission can rotate or revoke a token.',
        storageTitle: 'Storage access by role',
        storageHeaders: ['Provider', 'Super admin', 'Regular admin'],
        storageR2:    ['Cloudflare R2', '✓ Configure + use', '✓ Configure + use'],
        storageBlob:  ['Vercel Blob', '✓ Configure + use', '✗ Not available'],
        setupNote:    'The super admin\'s project membership is injected at setup time via `initializeSchemaService()` and kept in sync via a JWT fallback in `auth.ts`. No manual DB work is needed.',
      },
      installation: {
        title:       'Installation',
        intro:       'Cartum CMS can be installed in two ways: using the interactive CLI (recommended) or by cloning the repository manually.',
        quickTitle:  'Quick install (recommended)',
        quickDesc:   'Use the CLI installer to set up a new project interactively. Choose your package manager:',
        quickThenTitle: 'Then start your project:',
        manualTitle: 'Manual installation',
        manualSteps: {
          s1: 'Clone the repository.',
          s2: 'Install dependencies.',
          s3: 'Copy the environment file.',
          s4: 'Edit .env with your values.',
          s5: 'Run database migrations.',
          s6: 'Start the development server.',
        },
        envTitle:    'Environment variables',
        envRequired: 'Required',
        envOptional: 'Optional',
        envVars: {
          dbUrl:       'DATABASE_URL: PostgreSQL connection string (Neon or Supabase).',
          dbProvider:  'DB_PROVIDER: Database provider. Values: "neon" or "supabase".',
          authSecret:  'AUTH_SECRET: Random secret for authentication. Generate with: openssl rand -base64 32',
          authUrl:     'AUTH_URL: Your app base URL without trailing slash.',
          nodeEnv:     'NODE_ENV: "development" or "production".',
          r2:          'R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL: Cloudflare R2 storage credentials.',
          blob:        'BLOB_READ_WRITE_TOKEN: From Vercel Dashboard, Storage, Blob. Videos limited to 50 MB without VPS.',
          resend:      'RESEND_API_KEY, RESEND_FROM_EMAIL: Resend email service credentials.',
          vps:         'MEDIA_VPS_URL, MEDIA_VPS_KEY: Optional Optimus VPS for advanced media optimization.',
        },
        scriptsTitle: 'Available scripts',
        scripts: {
          dev:      'pnpm dev: Start the development server at localhost:3000.',
          build:    'pnpm build: Build for production.',
          start:    'pnpm start: Start the production server.',
          migrate:  'pnpm db:migrate: Apply pending database migrations.',
          generate: 'pnpm db:generate: Generate new migrations from schema changes.',
          studio:   'pnpm db:studio: Open Drizzle Studio, a visual database explorer.',
          seed:     'pnpm db:seed: Seed the database with default data.',
          lint:     'pnpm lint: Run ESLint.',
        },
        prereqTitle: 'Prerequisites',
        prereqs: {
          db:   'PostgreSQL database via Neon or Supabase.',
          node: 'Node.js 18 or later.',
          pkg:  'pnpm, npm or yarn as your package manager.',
          git:  'Git (for manual installation).',
          ssl:  'openssl available in your terminal (for generating AUTH_SECRET).',
        },
        repoNote: 'Source code and issues: github.com/azanoRivers/cartum-cms',
      },
      usersGuide: {
        title: 'Users & Roles',
        intro: 'Cartum has two distinct user levels with different scopes of access: the super admin and project admins. Understanding the difference is important before deploying to production.',

        superAdminTitle: 'Super admin',
        superAdminIntro: 'The super admin is the first account created during initial setup. Whether you install locally or deploy to the cloud, the setup wizard asks you to create this account before anything else.',
        superAdminHow: 'How it is created',
        superAdminHowDesc: 'When you run the CMS for the first time and visit the /setup route, you provide an email and password. That account is flagged as isSuperAdmin in the database and is the only account that can never be created from inside the CMS itself. You must have access to the server or the setup flow to create a second super admin.',
        superAdminNote: 'The super admin is not scoped to any single project. It has access to everything across all projects in the instance.',

        adminTitle: 'Project admin',
        adminIntro: 'Project admins are regular users who have been granted admin-level access to one or more projects. They are created in two ways: invited to an existing project by a super admin or another admin, or registered via the public /register route when the first project is being set up.',
        adminNote: 'An admin\'s permissions are always scoped to the projects they belong to. They cannot see or affect other projects.',

        comparisonTitle: 'What each role can do',
        comparisonHeaders: { feature: 'Feature', superAdmin: 'Super admin', admin: 'Admin' },
        comparison: {
          r1: { feature: 'Access all projects in the instance',        sa: 'Yes', adm: 'No — own projects only' },
          r2: { feature: 'Settings → Defaults (CMS-wide providers)',   sa: 'Yes', adm: 'No' },
          r3: { feature: 'Settings → Variables (env var overrides)',    sa: 'Yes', adm: 'No' },
          r4: { feature: 'Settings → Users (global user management)',   sa: 'Yes', adm: 'No' },
          r5: { feature: 'Settings → Cartum Projects (all projects)',   sa: 'Yes', adm: 'No' },
          r6: { feature: 'View full credentials (API keys, secrets)',   sa: 'Yes', adm: 'No — status badge only' },
          r7: { feature: 'Configure storage per project',               sa: 'Yes', adm: 'Yes' },
          r8: { feature: 'Configure email per project',                 sa: 'Yes', adm: 'Yes' },
          r9: { feature: 'Invite users to a project',                   sa: 'Yes', adm: 'Yes' },
          r10: { feature: 'Manage roles and permissions',               sa: 'Yes', adm: 'Yes — non-admin roles only' },
          r11: { feature: 'Create and delete decks and cards',          sa: 'Yes', adm: 'Yes' },
          r12: { feature: 'Access the DB danger zone',                  sa: 'Yes', adm: 'Yes — export/import only' },
          r13: { feature: 'Delete any project',                         sa: 'Yes', adm: 'No — only project owner' },
          r14: { feature: 'Send Help reports',                          sa: 'Yes', adm: 'Yes' },
        },

        localVsCloudTitle: 'Local vs cloud install',
        localVsCloudItems: {
          i1: 'Local install: the setup runs once on your machine. The super admin account is created there. Other team members join as admins or editors via invitations.',
          i2: 'Cloud deploy (Vercel, Cloudflare): the /setup route is accessible on first deploy. Complete it immediately — once setup is done, the route is locked and cannot be replayed.',
          i3: 'If you skip the setup route, no super admin exists and the CMS cannot function. You would need to re-deploy or reset the database.',
        },

        securityNote: 'Keep your super admin credentials secure. If you lose access to the super admin account and cannot recover it, a database reset will be required.',
      },
      storageSetup: {
        title: 'Storage Setup',
        intro: 'Step-by-step guides to connect Cloudflare R2 or Vercel Blob to your Cartum project. Settings are scoped per project and fall back to environment variables if not configured here.',
        r2Title: 'Cloudflare R2',
        r2Intro: 'Cloudflare R2 is an S3-compatible object storage with no egress fees. Follow these steps to get your credentials:',
        r2Steps: {
          s1: '1. Go to dash.cloudflare.com and log in to your account.',
          s2: '2. In the left sidebar, click R2 Object Storage under "Storage & Databases".',
          s3: '3. Click Create bucket. Enter a bucket name (e.g. my-cms-media), choose a region (Auto or closest to your users), then click Create bucket.',
          s4: '4. Open the bucket, go to Settings, and under "Public access" enable R2.dev subdomain OR connect a custom domain. Copy the generated public URL: this is your R2_PUBLIC_URL.',
          s5: '5. Back in the R2 dashboard, click Manage R2 API Tokens in the top-right corner.',
          s6: '6. Click Create API token. Name it (e.g. cartum-rw), set Permissions to "Object Read & Write", select the specific bucket, then click Create API Token.',
          s7: '7. Copy the Access Key ID and Secret Access Key shown. These are only shown once, save them securely.',
          s8: '8. For the R2 Endpoint: go to your Cloudflare Dashboard overview, find your Account ID in the right sidebar. The endpoint format is: https://<account_id>.r2.cloudflarestorage.com',
        },
        r2EnvTitle: 'Environment variables',
        r2EnvVars: {
          v1: 'R2_ENDPOINT: https://<account_id>.r2.cloudflarestorage.com',
          v2: 'R2_ACCESS_KEY_ID: Access Key ID from the API token',
          v3: 'R2_SECRET_ACCESS_KEY: Secret Access Key from the API token',
          v4: 'R2_BUCKET_NAME: bucket name (e.g. my-cms-media)',
          v5: 'R2_PUBLIC_URL: public URL from step 4 (pub-xxx.r2.dev or custom domain)',
        },
        r2CorsTitle: 'CORS (auto-configured)',
        r2CorsNote: 'Cartum automatically configures GET/HEAD CORS on your R2 bucket when you save storage settings. No manual CORS configuration is needed.',
        blobTitle: 'Vercel Blob',
        blobIntro: 'Vercel Blob is a managed storage service from Vercel. Follow these steps:',
        blobSteps: {
          s1: '1. Go to vercel.com, open your project dashboard.',
          s2: '2. Click the Storage tab in the project navigation.',
          s3: '3. Click Create, then select Blob.',
          s4: '4. Give your blob store a name and click Create.',
          s5: '5. Once created, open the blob store, go to the Settings tab.',
          s6: '6. Under Tokens, click Create Token. Choose Read & Write permissions, then click Create.',
          s7: '7. Copy the generated token (starts with vercel_blob_rw_). This is your BLOB_READ_WRITE_TOKEN.',
        },
        blobEnvTitle: 'Environment variable',
        blobEnvVar: 'BLOB_READ_WRITE_TOKEN: the token from step 7',
        switchTitle: 'Switching providers via the UI',
        switchIntro: 'Once you have configured both R2 and Blob, you can switch the active provider for any project from Settings → Storage without touching environment variables.',
        switchItems: {
          i1: 'Super admins see a provider selector at the top of the Storage section when both providers are configured.',
          i2: 'Project admins also see the selector. To switch, they must first configure the credentials for the target provider (enter the replace fields in the accordion), then select it.',
          i3: 'Switching triggers a server-side validation: if the target provider lacks credentials, the switch is rejected even if the client bypasses the UI check.',
        },
        fallbackTitle: 'Fallback chain',
        fallbackIntro: 'When Cartum resolves which provider to use for a media upload, it checks in this order:',
        fallbackItems: {
          i1: '1. Project-specific setting: storage_provider:{projectId} in app_settings.',
          i2: '2. Instance default: default_storage_provider in app_settings (set from Settings → Defaults).',
          i3: '3. Hardcoded fallback: R2 if none of the above is set.',
        },
        defaultsTitle: 'CMS-wide default (super admin)',
        defaultsIntro: 'Super admins can set a CMS-wide default provider from Settings → Defaults → Storage Provider. This default applies to any project that has not configured a local provider. Setting a default requires that the target provider is already configured globally (via environment variables or the Variables section).',
        scopeNote: 'Credentials saved in the Settings panel are scoped to that specific project and take precedence over environment variables. Other projects continue using their own settings or the instance defaults. The CMS-wide default set in Defaults applies only when no project-level override exists.',
      },
      emailSetup: {
        title: 'Email Setup',
        intro: 'Cartum uses email to send password resets, user invitations, and OTP codes for account changes. You can configure the email provider per project from Settings → Email, or set a CMS-wide default from Settings → Defaults (super admin only).',

        howTitle: 'How it works',
        howItems: {
          i1: 'Each project can have its own provider and credentials, overriding the instance default.',
          i2: 'If a project has no configuration, Cartum falls back to the CMS-wide default provider.',
          i3: 'The CMS-wide default is set in Settings → Defaults and applies to all projects without a local override.',
          i4: 'Two providers are supported: Resend and AWS SES.',
        },

        resendTitle: 'Resend',
        resendIntro: 'Resend is a developer-first email API. It is the recommended provider for most projects. To get started:',
        resendSteps: {
          s1: '1. Create an account at resend.com.',
          s2: '2. Go to API Keys and click Create API Key. Give it a name and choose Send access.',
          s3: '3. Copy the key (starts with re_). This is your RESEND_API_KEY.',
          s4: '4. Go to Domains and add the domain you will send from. Follow the DNS verification steps.',
          s5: '5. Once verified, set your From address using that domain (e.g. hello@yourdomain.com). This is your RESEND_FROM_EMAIL.',
        },
        resendEnvTitle: 'Environment variables',
        resendEnvVars: {
          v1: 'RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx',
          v2: 'RESEND_FROM_EMAIL=hello@yourdomain.com',
        },
        resendNote: 'Unverified domains will cause Resend to reject the send request. Always verify your domain before going to production.',

        sesTitle: 'AWS SES',
        sesIntro: 'AWS Simple Email Service (SES) is a scalable, low-cost email solution for high-volume sending. To get started:',
        sesSteps: {
          s1: '1. Log in to your AWS console and navigate to Amazon SES.',
          s2: '2. Go to Verified identities and add your sending domain or email address.',
          s3: '3. Follow the DNS/verification steps (DKIM, DMARC recommended for deliverability).',
          s4: '4. Go to IAM → Users → Create user. Attach the AmazonSESFullAccess policy (or a scoped send-only policy).',
          s5: "5. Under the user's Security credentials tab, create an Access key. Save the Access Key ID and Secret Access Key.",
          s6: '6. Set AWS_SES_FROM_EMAIL to the verified identity you want to send from.',
        },
        sesEnvTitle: 'Environment variables',
        sesEnvVars: {
          v1: 'AWS_SES_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE',
          v2: 'AWS_SES_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          v3: 'AWS_SES_FROM_EMAIL=hello@yourdomain.com',
          v4: '# Optional — defaults to us-east-1',
          v5: 'AWS_SES_REGION=us-east-1',
        },
        sesNote: 'New AWS SES accounts are in sandbox mode and can only send to verified addresses. Request production access from the SES console before sending to real users.',

        uiTitle: 'Configuring via the UI',
        uiIntro: 'You can configure and switch providers without touching environment variables. All values entered in the UI override the environment variables for that specific project:',
        uiItems: {
          i1: 'Settings → Email — configure Resend or AWS SES per project. Admins can replace credentials. Super admins can see and edit the full keys.',
          i2: 'Settings → Defaults — choose the CMS-wide default provider. Only super admins can access this section.',
          i3: 'Switching provider requires that the target provider already has credentials configured (either via env vars or UI overrides).',
          i4: 'Use the "Send test email" button in both sections to verify delivery before going live.',
        },

        scopeNote: 'Credentials saved in the Settings panel are project-scoped and take precedence over environment variables. The Defaults section stores a CMS-wide default provider that applies to all projects without a local override.',
        docsLink: 'Resend documentation ↗',
        docsLinkSes: 'AWS SES documentation ↗',
      },
    },
    canvas: {
      ariaLabel:           'Deck board',
      loading:             'Loading board…',
      empty:               'No decks yet.',
      emptyHint:           'Use (G + N) to create your first deck or click +',
      multiSelected:       'selected',
      multiSelectedHint:   'drag to move · right-click to delete · Esc to clear',
    },
    nodeCard: {
      fields:      'attributes',
      records:     'cards',
      connections: 'connections',
      required:    '*',
      types: {
        text:     'text',
        number:   'number',
        boolean:  'boolean',
        image:    'image',
        video:    'video',
        gallery:  'gallery',
        relation: 'relation',
      },
    },
    creation: {
      ariaLabel:       'Create deck',
      titleTypeSelect: 'Create',
      titleFieldType:  'Select card type',
      titleName:       'Name your deck',
      containerLabel:  'Deck',
      containerDesc:   'Groups cards of the same type',
      fieldLabel:      'Card',
      fieldDesc:       'Defines a property for each card',
      nodeName:        'Deck name',
      placeholder:     'e.g. products',
      back:            'Back',
      create:          'Create',
      errors: {
        nameRequired: 'Name is required.',
        nameTaken:    'A deck with this name already exists.',
      },
    },
    fieldTypePicker: {
      text:     'Text',
      number:   'Number',
      boolean:  'Boolean',
      image:    'Image',
      video:    'Video',
      relation: 'Relation',
      gallery:  'Gallery',
    },
    fieldEdit: {
      ariaLabel:        'Edit attribute',
      title:            'Edit attribute',
      name:             'Name',
      requiredToggle:   'Required',
      fieldType:        'Attribute type',
      cancel:           'Cancel',
      save:             'Save',
      saving:           'Saving…',
      typeChangeBlocked: 'This attribute already has cards. Delete all cards from this deck first to change the type.',
      typeChangeConfirmTitle:   'Change attribute type',
      typeChangeConfirmBody:    'THE VALUE SAVED IN THIS CARD WILL BE LOST',
      typeChangeConfirmSubtext: 'Changing the attribute type of the card will delete the current content.',
      typeChangeConfirm:        'Change type',
      text: {
        multiline:               'Multiline (Text/Headings/Bold)',
        maxLength:               'Max length (optional)',
        maxLengthPlaceholder:    'e.g. 255',
        defaultValueLabel:       'Default value (optional)',
        defaultValuePlaceholder: 'Enter default text…',
        richTextBold:            'Bold',
        richTextBoldTip:         'Make selected text bold',
        richTextItalic:          'Italic',
        richTextItalicTip:       'Make selected text italic',
        richTextTitle:           'Title',
        richTextTitleTip:        'Format selected line as a heading',
        richTextAlignLeft:       'Left',
        richTextAlignCenter:     'Center',
        richTextAlignRight:      'Right',
        richTextColor:           'Color',
        richTextColorTip:        'Apply color to selected text',
        richTextLink:            'Link',
        richTextLinkTip:         'Insert a hyperlink',
        richTextLinkTextLabel:   'Text',
        richTextLinkUrlLabel:    'URL',
        richTextLinkInsert:      'Insert',
        richTextLinkCancel:      'Cancel',
        richTextHtml:            'HTML',
        richTextHtmlTip:         'Insert raw HTML code',
        richTextHtmlCodeLabel:   'HTML code',
        richTextHtmlInsert:      'Insert',
        richTextHtmlCancel:      'Cancel',
        richTextClear:           'Clear',
        richTextClearTip:        'Remove all formatting',
      },
      number: {
        subtype:              'Subtype',
        subtypeInt:           'integer',
        subtypeFloat:         'decimal',
        valueModeLabel:       'Value type',
        valueModeFixed:       'Fixed',
        valueModeRange:       'Range',
        fixedValue:           'Value',
        fixedValuePlaceholder: 'e.g. 42',
        min:                  'Min',
        max:                  'Max',
        minPlaceholder:       '',
        maxPlaceholder:       '',
        rangeError:           'Min must be less than or equal to Max.',
      },
      boolean: {
        defaultValue:    'Default value',
        trueLabel:       'True label (optional)',
        falseLabel:      'False label (optional)',
        truePlaceholder: 'e.g. Active',
        falsePlaceholder: 'e.g. Inactive',
      },
      storage: {
        notConfiguredImages: 'Storage is not configured. Images can be added in Settings → Storage.',
        notConfiguredVideos: 'Storage is not configured. Videos can be added in Settings → Storage.',
        configuredImages:    'Storage configured. Images will be uploaded and optimized automatically in cards.',
        configuredVideos:    'Storage configured. Videos will be uploaded and optimized automatically in cards.',
        imageFormats:        'Accepted formats: WebP, JPEG (auto-optimized)',
        videoFormats:        'Accepted formats: MP4, WebM (auto-optimized)',
        goToContent:         'Upload files in a new card',
      },
      relation: {
        targetLabel:       'Target deck',
        targetPlaceholder: 'Select a deck',
        relationType:      'Relation type',
      },
      errors: {
        nameRequired:     'Name is required.',
        nameInvalid:      'Name contains invalid characters.',
        nameTaken:        'An attribute with this name already exists.',
        relTargetRequired: 'Please select a target deck.',
        unknown:          'Unknown error.',
      },
      accordion: {
        typeSection:    'Attribute type',
        contentSection: 'Content',
      },
      mediaContent: {
        noImage:       'No default image',
        noVideo:       'No default video',
        dragOrSelect:  'Drag here or choose an option',
        dropHere:      'Drop here',
        selectFromLib: 'From library',
        uploadNew:     'Upload file',
        changeMedia:   'Change',
        removeMedia:   'Remove',
        confirmRemove: 'Confirm?',
        otherTypesMsg: 'This attribute is edited in the deck\'s cards.',
        uploading:     'Uploading…',
        optimizing:    'Optimizing…',
        uploadError:   'Upload failed.',
        fromUrl:       'From URL',
        urlPlaceholder: 'https://…',
      },
      gallery: {
        maxItems:            'Max images (optional)',
        maxItemsPlaceholder: 'e.g. 10',
      },
      galleryContent: {
        addImage:      'Add image',
        removeImage:   'Remove',
        confirmRemove: 'Confirm?',
        selectFromLib: 'From library',
        uploadNew:     'Upload',
        empty:         'No images yet. Add the first one.',
        maxReached:    'Maximum number of images reached.',
        uploading:     'Uploading…',
        optimizing:    'Optimizing…',
        uploadError:   'Upload failed.',
        fromUrl:       'From URL',
        urlPlaceholder: 'https://…',
        addAnotherUrl: 'Add another link',
        addUrls:       'Add',
      },
    },
    mobileList: {
      empty:           'No decks yet.',
      emptyHint:       'Use + to create your first deck.',
      fieldsSeparator: 'Attributes',
    },
    content: {
      title:         'Content',
      backToContent: 'Back to Content',
      index: {
        emptyOwn: 'No content areas have been assigned to your account.',
        records:  'cards',
        browse:   'Browse cards',
      },
      list: {
        newRecord:       'New card',
        search:          'Search…',
        noResults:       'No cards found.',
        empty:           'No cards yet.',
        createdAt:       'Created',
        editAriaLabel:   'Edit',
        deleteAriaLabel: 'Delete',
        confirmDelete:   'Delete this card?',
        confirmYes:      'Delete',
        confirmNo:       'Cancel',
      },
      form: {
        newTitle: 'New card',
        editTitle: 'Edit card',
        save:     'Save',
        saving:   'Saving…',
        discard:  'Discard',
        errors: {
          required:      'This attribute is required.',
          invalidNumber: 'Must be a valid number.',
          numberRange:   'Value is out of the allowed range.',
          relRequired:   'Please select a linked card.',
          unknown:       'Unknown error.',
        },
      },
      upload: {
        storageNotConfigured: 'Storage is not configured. Set it up in Settings → Storage.',
        imageFormats:         'Accepted: JPG, PNG, WebP, GIF',
        videoFormats:         'Accepted: MP4, MOV, WebM',
        dragOrClick:          'Drag a file here or click to upload',
        uploading:            'Uploading…',
        change:               'Change',
        remove:               'Remove',
        chooseFromLibrary:    'Choose from library',
        uploadNew:            'Upload new',
        uploadSuccess:        'File uploaded successfully.',
        uploadError:          'Upload failed. Please try again.',
        invalidType:          'File type not allowed.',
        fileTooLarge:         'File exceeds the maximum allowed size.',
        tier1ImageWarn:       'Image was compressed before upload.',
        tier1VideoWarn:       'Video was compressed before upload.',
        vpsUnreachable:       'Optimization server could not be reached. Uploaded original.',
        vpsAuthError:         'Optimization server rejected the API key.',
        vpsAuthErrorDesc:     'Go to Settings → Media and update the VPS API key.',
        vpsValidationWarn:    'Optimization server rejected the file. Uploaded original.',
        vpsTimeout:           'Optimization server timed out. Uploaded original.',
        vpsPartial:           'Optimization partially succeeded ({processed}/{total} files).',
        videoProcessing:      'Processing video…',
        mediaLibraryTitle:    'Media Library',
        searchPlaceholder:    'Search…',
        sortNewest:           'Newest',
        sortOldest:           'Oldest',
        emptyLibrary:         'No media files yet.',
        emptySearch:          'No results for your search.',
        selectAsset:          'Select',
        loadingMore:          'Loading more…',
      },
      relation: {
        placeholder: 'Select a card',
        noOptions:   'No cards found.',
      },
      mediaGallery: {
        title:           'Gallery',
        tabImages:       'Images',
        tabVideos:       'Videos',
        searchPlaceholder: 'Search…',
        uploadBtn:       'Upload',
        emptyImages:     'No images yet.',
        emptyVideos:     'No videos yet.',
        noUploadAccess:  'You don\'t have permission to upload content.',
        emptySearch:     'No results for your search.',
        dropHere:        'Drop files here',
        orClick:         'or click to browse',
        uploadStart:     'Upload',
        optimizing:      'Optimizing…',
        uploading:       'Uploading',
        uploadSuccess:   'File uploaded.',
        uploadError:     'Upload failed.',
        deleteLabel:     'Delete',
        confirmDelete:   'Sure?',
        deleteSuccess:   'File deleted.',
        deleteError:     'Could not delete file.',
        copyUrlLabel:    'Copy URL',
        copiedLabel:     'Copied!',
        ofLabel:         'of',
        perPageLabel:    'Per page',
        // Optimus VPS warnings (upload succeeds but optimizer had issues)
        vpsUnreachable: 'Uploaded without optimization. Optimizer is unreachable.',
        vpsAuth:        'Uploaded without optimization. Invalid optimizer API key.',
        vpsTimeout:     'File too large for the optimizer. Uploaded as original.',
        vpsValidation:  'Format not supported by the optimizer. Uploaded as original.',
        vpsPartial:     'Partially optimized. Some images uploaded as originals.',
        vpsQueueFull:   'Optimus busy. Uploading without optimization.',
        // Bulk selection
        bulkPlaceholder:     'Bulk action',
        bulkDownload:        'Download',
        bulkDelete:          'Delete',
        bulkSelected:        '{n} selected',
        bulkClear:           'Clear selection',
        bulkDeleteTitle:     'Delete selection',
        bulkDeleteBody:      'Delete {n} file(s)? This action cannot be undone.',
        bulkDeleteConfirm:   'Delete {n}',
        bulkDeleteCancel:    'Cancel',
        bulkDeleting:        'Deleting…',
        bulkDeletedSuccess:  'Deleted {n} file(s).',
        bulkDeletedPartial:  'Deleted {deleted} file(s). {failed} failed.',
        bulkDownloading:     'Preparing ZIP…',
        bulkDownloadSuccess: 'Downloaded {n} file(s).',
        imageLimitError:  'You can upload up to 25 images at a time.',
        videoLimitError:  'You can upload up to 5 videos at a time.',
        duplicateError:   'Already in queue or gallery: {names}',
        uploadedBatch:      '{n} file(s) uploaded successfully.',
        uploadErrorBatch:   '{n} file(s) failed to upload.',
        compressionBatch:   'Files compressed ~{pct}% on average.',
        videoUploadWarning: 'Video upload and compression may take a while. Do not close this window or uploads will be lost.',
        // Video VPS upload phases
        videoSizeError:   'Video exceeds the 500 MB limit.',
        videoChunking:    'Uploading to VPS…',
        videoProcessing:  'Compressing…',
        videoFinalizing:  'Saving…',
        videoVpsSkipped:       'Optimizer not configured. Uploading original.',
        videoBlobTooLarge:     'Video exceeds 50 MB. Use Cloudflare R2 or configure a VPS optimizer to upload larger videos.',
        videoBlobFallbackFail: 'VPS error and video exceeds the 50 MB Blob limit. Cannot upload.',
        // Video fallback warning modal
        videoFallbackTitle:  'Large video warning',
        videoFallbackBody:   'This video exceeds 100 MB, which is above the recommended limit. Large videos may cause slow load times even after compression. Consider using a smaller or pre-optimized file.',
        videoFallbackUpload: 'Upload anyway',
        videoFallbackCancel: 'Cancel',
        imageFallbackTitle:  'Large image, no optimizer available',
        imageFallbackBody:   'This image exceeds 5 MB and the Optimus optimizer is not configured. Uploading without optimization may result in slow load times. Consider compressing the image before uploading.',
        imageFallbackUpload: 'Upload anyway',
        imageFallbackCancel: 'Cancel',
        estimatedTimeLabel:   'Estimated optimization time',
        estimatedSecsUnit:    'Seconds',
        estimatedMinsUnit:    'Minutes',
        finalizingSoonLabel:  'Upload finishing soon…',
        imageUploadWarning:   'Do not close or reload while images are being processed. Progress will be lost.',
        // Close confirmation when active uploads exist
        uploadCancelConfirmTitle: 'Cancel uploads?',
        uploadCancelConfirmDesc:  'Closing will cancel active uploads and optimizations. Nothing will be saved.',
        uploadCancelConfirmYes:   'Yes, close',
        uploadCancelConfirmNo:    'Keep uploading',
      },
    },
    board: {
      title: 'Board',
      canvasMenu: {
        back:       'Go back',
        forward:    'Go forward',
        fitAll:     'Center decks',
        createDeck: 'New deck here',
      },
      contextMenu: {
        rename:     'Rename',
        duplicate:  'Duplicate',
        deleteNode: 'Delete deck',
        back:       'Go back',
        forward:    'Go forward',
        fitAll:     'Center decks',
      },
      deleteDialog: {
        title:                  'Delete "{name}"?',
        safeMessage:            'This action cannot be undone.',
        warnMessage:            'This will remove related data and cannot be undone.',
        dangerMessage:          'This has dangerous consequences and cannot be undone.',
        cancel:                 'Cancel',
        confirm:                'Confirm delete',
        confirmDanger:          'Yes, delete anyway',
        deleting:               'Deleting…',
        factorChildren:         '{count} card(s) in this deck',
        factorConnections:      '{count} link(s) to other decks',
        factorRecordsContainer: '{count} card(s) in this deck',
        factorRecordsField:     '{count} card(s) will lose this attribute',
        factorRelations:        '{count} link(s) pointing to this deck',
      },
      toast: {
        duplicateSuccess: 'Deck duplicated.',
        duplicateError:   'Could not duplicate deck.',
        deleteSuccess:      'Deck deleted.',
        deleteError:        'Could not delete deck.',
        deleteFieldSuccess: 'Card deleted.',
        deleteFieldError:   'Could not delete card.',
        checkRiskError:   'Could not check deck dependencies. Please try again.',
        renameSuccess:    'Deck renamed.',
        renameError:      'Could not rename deck.',
      },
      renameDialog: {
        title:       'Rename deck',
        label:       'Deck name',
        placeholder: 'my_deck_name',
        cancel:      'Cancel',
        save:        'Save',
        saving:      'Saving…',
      },
    },
    notFound: {
      title:    'Page not found',
      message:  "The deck or page you're looking for doesn't exist, was deleted, or the URL is invalid.",
      back:     'Back to board',
    },
  },
  settings: {
    nav: {
      account:         'Account',
      appearance:      'Appearance',
      project:         'Projects',
      subscription:    'Subscription',
      storage:         'Storage',
      email:           'Email',
      api:             'API Tokens',
      members:         'Members',
      users:           'Users',
      roles:           'Roles',
      info:            'Info',
      db:              'Database',
      webMigration:    'Web Migration',
      help:            'Help',
      cartumProjects:  'Cartum Projects',
      variables:       'Variables',
      defaults:        'Defaults',
      superDb:         'Super DB',
    },
    panelTitle: 'SETTINGS',
    loading:    'Loading…',
    appearance: {
      title:      'Appearance',
      themeLabel: 'Every table has its personality. Pick yours!',
      saved:      'Theme saved.',
      saveError:  'Could not save theme.',
      themes: {
        dark:       { label: 'Dark',         description: 'Night follows you across every project.' },
        cyberSoft:  { label: 'Cyber Soft',   description: 'Standard modern dark environment.' },
        light:      { label: 'Light',        description: 'Slate white. Bright environments.' },
        dusk:       { label: 'Metal',        description: 'Modern metallic blue. Elegant and cool.' },
        matrix:     { label: 'Matrix',       description: "A classic. Neo would be proud. Or would he?" },
        cyberHuman:     { label: 'Cyber Human',      description: 'Human evolution has no limits. Expand your mind.' },
        strangerThings: { label: 'Stranger Things',  description: 'Upside Down. Orange gate & acid green.' },
      },
    },
    project: {
      title:                  'Projects',
      projectName:            'Project name',
      description:            'Description',
      descriptionPlaceholder: 'Short description of this project (optional)',
      defaultLocale:          'Default locale',
      localeEn:               'English',
      localeEs:               'Spanish',
      save:                   'Save changes',
      saving:                 'Saving...',
      saved:                  'Project settings saved.',
      error:                  'Could not save project settings.',
      selectProject:          'Select project',
      noProjects:             'No projects found.',
      dangerZone:             'Danger zone',
      dangerDesc:             'Permanently deletes this project: all decks, cards, records and media files. Members keep their accounts but lose access. This cannot be undone.',
      onlyOwnerCanDelete:     'Only the project owner can delete this project.',
      deleteProject:          'Delete project',
      deleting:               'Deleting...',
      deleteSuccess:          'Project deleted.',
      deleteError:            'Could not delete project.',
      singleProjectWarning:   'You cannot delete your only project.',
      docsLinkLabel:          'Multi-project: Documentation',
      docsLinkDesc:           'Learn how multiple projects coexist on the same Cartum table and how to manage them.',
      confirmDialog: {
        title:         'Delete project',
        message:       'This will permanently delete all data associated with this project. This action cannot be undone.',
        inputLabel:    'Type DELETE PROJECT to confirm',
        confirmPhrase: 'DELETE PROJECT',
        confirm:       'Delete project',
        cancel:        'Cancel',
      },
    },
    storage: {
      title:                   'Storage',
      projectScopeNote:        'Settings apply to this project only. Leave blank to inherit instance defaults.',
      r2SectionTitle:          'Cloudflare R2',
      r2Endpoint:              'R2 Endpoint',
      r2EndpointPlaceholder:   'https://<account_id>.r2.cloudflarestorage.com',
      r2AccessKeyId:           'Access Key ID',
      r2AccessKeyIdPlaceholder: 'R2 access key ID',
      r2SecretAccessKey:       'Secret Access Key',
      r2SecretAccessKeyPlaceholder: 'R2 secret access key',
      r2BucketName:            'Bucket name',
      r2BucketNamePlaceholder: 'my-bucket',
      r2PublicUrl:             'Public URL',
      r2PublicUrlPlaceholder:  'https://pub-xxx.r2.dev or custom domain',
      r2DocsLink:              'How to set up Cloudflare R2',
      r2Warning:               'Incorrect credentials will prevent file uploads. Verify all values in the Cloudflare dashboard before saving.',
      blobSectionTitle:        'Vercel Blob',
      blobToken:               'Blob read/write token',
      blobTokenPlaceholder:    'vercel_blob_rw_...',
      blobTokenHint:           'From your Vercel dashboard, Storage, Blob, Token.',
      blobDocsLink:            'How to set up Vercel Blob',
      blobWarning:             'Incorrect token will prevent file uploads. Verify it in your Vercel project dashboard.',
      testBlob:                'Test Blob connection',
      testBlobOk:              'Blob connected.',
      testBlobFail:            'Could not connect to Blob.',
      vpsSectionTitle:         'VPS Media Optimizer',
      mediaVpsUrl:             'Optimizer server URL',
      mediaVpsUrlPlaceholder:  'https://optimus.azanolabs.com',
      mediaVpsUrlLocked:       'URL can only be changed by a super admin.',
      mediaVpsKey:             'Optimizer API key',
      mediaVpsWarning:         'An incorrect API key or URL will fall back to client-side compression without VPS optimization.',
      apiDocsLink:             'API Docs',
      fieldSet:                'Configured',
      fieldNotSet:             'Not configured',
      fieldReplaceLabel:       'Enter new value to replace',
      showKey:                 'Show',
      hideKey:                 'Hide',
      testConnection:          'Test R2 connection',
      testing:                 'Testing...',
      testOk:                  'Connected · {latencyMs}ms',
      testFail:                'Connection failed.',
      providerLabel:           'Active provider',
      providerR2:              'Cloudflare R2',
      providerBlob:            'Vercel Blob',
      providerSaved:           'Provider updated.',
      providerError:           'Could not update provider.',
      providerSelectHint:          'Select the active storage provider for new uploads.',
      providerSelectHintAdmin:     'To switch provider, configure the credentials for the target provider in its accordion below, then select it here.',
      providerMissingCredentials:  'Configure the required credentials for this provider before switching.',
      providerUnsaved:             'Unsaved changes — provider not yet switched.',
      saveProviderBtn:             'Save changes',
      statusConfigured:        'Configured',
      statusNotConfigured:     'Not configured',
      statusActive:            'Active',
      save:                    'Save changes',
      saving:                  'Saving...',
      saved:                   'Storage settings saved.',
      error:                   'Could not save storage settings.',
      saveEmptyNotice:         'Only filled fields are saved. Empty fields keep their current value.',
      docsLinkLabel:           'Storage setup guides',
      docsLinkDesc:            'Step-by-step guides for Cloudflare R2, Vercel Blob, and the media optimizer.',
    },
    email: {
      title:               'Email',
      docsLinkLabel:       'Email setup: Documentation',
      docsLinkDesc:        'Step-by-step guide to configure Resend or AWS SES as your email provider.',
      notConfigured:       'Email delivery is not configured. Configure a provider to enable password recovery and invitations.',
      providerLabel:       'Email provider',
      active:              'Active',
      inactive:            'Inactive',
      configured:          'Configured',
      notConfiguredBadge:  'Not configured',
      resendTab:           'Resend',
      sesTab:              'AWS SES',
      resendApiKey:        'Resend API key',
      resendKeyPlaceholder: 're_••••••••••••',
      apiKeySet:           'API key configured',
      apiKeyNotSet:        'No API key configured',
      apiKeyReplaceLabel:  'Replace API key',
      apiKeyReplacePlaceholder: 'Enter new key to replace the current one',
      sesAccessKeyId:      'AWS SES Access Key ID',
      sesSecretKey:        'AWS SES Secret Access Key',
      sesKeyPlaceholder:   'AKIA••••••••••••••••',
      sesSecretPlaceholder:'••••••••••••••••••••••••••••••••••••••••',
      fromEmailLabel:      'From email address',
      fromEmailHint:       'Sender address used for all outgoing emails from this project.',
      fromEmailDomainWarning: 'Changing the From domain may cause delivery failures if the new domain is not verified.',
      sesFromEmailLabel:      'AWS SES From email (AWS_SES_FROM_EMAIL)',
      sesFromEmailDomainWarning: 'The sender domain must be verified and configured correctly in',
      unsavedProvider:        'Unsaved changes — provider not yet switched.',
      saveProvider:           'Save changes',
      providerSwitchWarning:  'To switch provider you must include the Access Key for Resend or the Access Key ID + Secret Access Key for AWS SES, otherwise you cannot save the new email provider configuration.',
      providerSwitchError:    'Configure credentials for this provider before switching.',
      testToPlaceholder:      'Send test to email…',
      testEmail:           'Send test email',
      testing:             'Sending...',
      testOk:              'Test email sent.',
      testFail:            'Could not send test email.',
      save:                'Save',
      saving:              'Saving...',
      saved:               'Settings saved.',
      error:               'Could not save settings.',
      projectScopeNote:    'These settings apply to this project only. Leave blank to use the instance default.',
    },
    api: {
      title:           'Tokens API',
      tokenListTab:    'My Tokens',
      newTokenTab:     'New Token',
      tokenName:       'Name',
      lastUsed:        'Last used',
      expiresCol:      'Expires',
      never:           'Never',
      revoke:          'Revoke',
      revoking:        'Revoking...',
      revokeSuccess:   'Token revoked.',
      newTokenTitle:   'New token',
      nameLabel:       'Token name',
      namePlaceholder: 'e.g. Frontend App',
      expiresLabel:    'Expiry date',
      createButton:    'Create token',
      creating:        'Creating...',
      createSuccess:   'Token created.',
      createError:     'Could not create token.',
      copyToken:       'Copy token',
      copied:          'Copied!',
      tokenOnceNotice: 'Copy this token now. It will not be shown again.',
      confirmCopied:   'I have copied this token',
      close:           'Close',
      empty:           'No active tokens.',
      scopeLabel:      'Permissions',
      scopeRead:       'Read',
      scopeWrite:      'Write (create)',
      scopeUpdate:     'Update',
      scopeDelete:     'Delete',
      scopeCol:        'Scope',
      exclusionsLabel: 'Deck exclusions',
      addExclusion:    'Add exclusion',
      exclusionsHint:  'Excluded decks and their cards are not accessible by this token.',
      searchDecks:     'Search decks...',
      noDecksFound:    'No decks found.',
      removeExclusion: 'Remove',
      exclusionModalTitle: 'Select the deck(s) to exclude',
      exclusionModalClose: 'Cancel',
      exclusionConfirm:    'Exclude',
      docsLinkLabel: 'API documentation',
      docsLinkDesc:  'Learn how to authenticate requests, configure scopes, and consume the REST endpoints.',
    },
    members: {
      title:              'Members',
      subtitle:           'Invite and manage players at your table. Configure access roles.',
      docsLinkLabel:      'Roles & access: Documentation',
      docsLinkDesc:       'Learn how roles, permissions and section-level access control work.',
      inviteLabel:        'Invite a member',
      emailLabel:         'Email',
      projectLabel:       'Project',
      roleLabel:          'Role',
      emailPlaceholder:   'colleague@company.com',
      inviting:           'Inviting…',
      inviteButton:       'Invite',
      inviteSuccess:      'Invitation sent.',
      builtInRoleLabels:  { admin: 'Admin', editor: 'Editor', viewer: 'Viewer' },
      currentMembers:     'Current members',
      memberSingular:     'member',
      memberPlural:       'members',
      pendingTitle:       'Pending invitations',
      pending:            'pending',
      noPending:          'No pending invitations.',
      resend:             'Resend',
      revoke:             'Revoke',
      revokeConfirm:      'Revoke this invitation?',
      resendSuccess:      'Invitation resent.',
      revokeSuccess:      'Invitation revoked.',
      // MemberList strings
      ownerLabel:         'Owner',
      youLabel:           '(you)',
      changeRole:         'Change role',
      removeButton:       'Remove',
      removeConfirmTitle: 'Remove from project?',
      removeConfirmDesc:  'The user will lose access to this project immediately.',
      removeSuccess:      'Member removed.',
      removeError:        'Could not remove member.',
      roleUpdated:        'Role updated.',
      noMembers:          'No members yet.',
    },
    users: {
      title:              'All Users',
      subtitle:           'All registered users across the entire CMS instance.',
      empty:              'No users found.',
      noResults:          'No users match the filter.',
      youLabel:           '(you)',
      colCreated:         'Member since',
      filterSearch:       'Search by email…',
      filterSortLabel:    'Sort by',
      sortEmail:          'Email',
      sortCreated:        'Oldest',
      sortNewest:         'Newest',
      sortSub:            'Subscription',
      sortProjects:       'Projects',
      sortOwned:          'Owner of',
      colProjects:        'Projects',
      colOwned:           'Owner of',
      colSub:             'Subscription',
      subDaysLeft:        '{n}d left',
      subExpired:         'Expired',
      // Ban
      banButton:          'Ban',
      unbanButton:        'Unban',
      bannedBadge:        'Banned',
      banConfirmTitle:    'Ban user?',
      banConfirmDesc:     'The user will not be able to log in until unbanned.',
      unbanConfirmTitle:  'Unban user?',
      unbanConfirmDesc:   'The user will be able to log in again.',
      banSuccess:         'User banned.',
      unbanSuccess:       'User unbanned.',
      // Delete
      deleteButton:       'Delete',
      deleteConfirmTitle: 'Delete user?',
      deleteConfirmDesc:  'This permanently deletes the account. The user will be removed from all projects.',
      deleteSuccess:      'User deleted.',
      deleteError:        'Could not delete user.',
      // Subscription
      grantSubLabel:      'Subscription',
      grantSubTitle:      'Manage subscription',
      grantSubMonths:     '{n} mo.',
      grantSubButton:     'Grant',
      revokeSubButton:    'Revoke',
      revokeSubConfirmTitle: 'Revoke subscription?',
      revokeSubConfirmDesc:  'The user will lose access immediately.',
      grantSubSuccess:    'Subscription granted.',
      grantSubError:      'Could not grant subscription.',
      revokeSubSuccess:   'Subscription revoked.',
    },
    roles: {
      title:                 'Roles',
      builtIn:               'built-in',
      custom:                'custom',
      newRoleTitle:          'New role',
      roleNameLabel:         'Role name',
      roleNamePlaceholder:   'e.g. editor',
      createButton:          'Create',
      creating:              'Creating...',
      createSuccess:         'Role created.',
      createError:           'Could not create role.',
      deleteButton:          'Delete',
      deleting:              'Deleting...',
      deleteSuccess:         'Role deleted.',
      deleteError:           'Could not delete role.',
      confirmDeleteTitle:    'Delete role "{name}"?',
      confirmDeleteAffected: 'There are {count} user(s) with this role. You need to reassign them before deleting.',
      confirmDeleteNone:     'No users assigned to this role in this project.',
      reassignLabel:         'Select the role to assign them to:',
      permissionsTitle:      'Permissions · {name}',
      nodeCol:               'Node',
      readCol:               'Read',
      createCol:             'Create',
      updateCol:             'Update',
      deleteCol:             'Delete',
      wildcardRow:           '* (all other nodes)',
      savePerms:             'Save permissions',
      savingPerms:           'Saving...',
      permsSaved:            'Permissions saved.',
      permsError:            'Could not save permissions.',
      noCustomRoles:         'No custom roles yet.',
      selectToEdit:          'Select a custom role to edit its permissions.',
      systemBadge:           'SYSTEM',
      noPermission:          'All decks and cards on this table are yours to play. You hold the Admin hand.',
      noPermissionSub:       'Remember, with great power comes great responsibility.',
      nodeAccessTab:           'Deck & Node Access',
      settingsAccessTab:       'Settings Access',
      galleryAccessTab:        'Gallery Access',
      galleryImages:           'Images',
      galleryVideos:           'Videos',
      galleryView:             'View',
      galleryUpload:           'Upload',
      galleryDelete:           'Delete',
      gallerySave:             'Save',
      gallerySaving:           'Saving...',
      gallerySaved:            'Gallery permissions saved.',
      schemaAccessTab:         'Board Access',
      schemaBoardRow:          'Board',
      schema_canCreate:        'Create',
      schema_canUpdate:        'Edit',
      schema_canDelete:        'Delete',
      schema_canConnect:       'Connect',
      schemaSaved:             'Board permissions saved.',
      schemaViewNote:          'By default all roles can view the board.',
      sectionPermissionsTitle: 'Settings access',
      sectionColView:        'View',
      sectionColActions:     'Actions',
      saveSectionPerms:      'Save changes',
      savingSectionPerms:    'Saving...',
      sectionPermsSaved:     'Permissions saved.',
      sectionPermsError:     'Could not save permissions.',
      cancel:                'Cancel',
      userCount:             '{count} user(s)',
      projectScopeWarning:   'The Admin, Editor and Viewer roles cannot be deleted. Any changes you make here will only apply to the current project.',
      projectOverrideBadge:  'Project override',
      globalDefaultBadge:    'CMS default',
      builtInRoleLabels: {
        admin:      'Admin',
        editor:     'Editor',
        viewer:     'Viewer',
        restricted: 'Restricted',
      },
      docsLinkLabel: 'Roles & access: Documentation',
      docsLinkDesc:  'Learn how roles, permissions and section-level access control work.',
    },
    account: {
      title:               'Account',
      subtitle:            'Update your current email or passwords.',
      emailSection:        'Email address',
      currentEmail:        'Current email',
      newEmail:            'New email address',
      newEmailPlaceholder: 'new@example.com',
      sendCode:            'Send verification code',
      sending:             'Sending...',
      codeSentTo:          'A 4-digit code was sent to {email}. It expires in 10 minutes.',
      codeLabel:           'Verification code',
      codePlaceholder:     '0',
      confirmChange:       'Confirm change',
      confirming:          'Confirming...',
      resend:              'Resend code',
      emailUpdated:        'Email updated. Please log in again to refresh your session.',
      errors: {
        emailInvalid: 'Enter a valid email address.',
        emailTaken:   'This email is already in use.',
        sameEmail:    'This is already your email address.',
        invalidCode:  'Invalid or expired code.',
        unknown:      'Something went wrong. Please try again.',
      },
      password: {
        title:          'Password',
        currentLabel:   'Current password',
        newLabel:       'New password',
        change:         'Change password',
        changing:       'Changing...',
        changed:        'Password updated successfully.',
        generate:       'Generate',
        copy:           'Copy',
        copied:         'Copied!',
        errorWeak:      'Password must be at least 12 characters.',
        errorWrong:     'Current password is incorrect.',
        errorUnknown:   'Could not update password. Please try again.',
      },
    },
    webMigration: {
      title:                'Web Migration',
      // Accordion section headers
      dealerSection:        'Dealer Scrapper',
      dealerDescription:    'Tool where you provide a website URL to replicate its data into Cartum\'s Mazos and Cartas system.',
      configSection:        'API Config',
      statusConfigured:     'Configured',
      statusNotConfigured:  'Not configured',
      projectScopeNote:     'Settings apply to this project only. Leave blank to use the instance default.',
      apiUrl:               'API URL',
      apiKey:               'API Key',
      apiKeySet:            'API key configured',
      apiKeyNotSet:         'No API key configured',
      apiKeyReplaceLabel:   'Replace API key',
      apiKeyReplacePlaceholder: 'Enter new key to replace the current one',
      testConnection:       'Test connection',
      save:                 'Save',
      saving:               'Saving…',
      show:                 'Show',
      hide:                 'Hide',
      serverAvailable:      'Server available ({active}/{max} active jobs)',
      serverBusy:           'Server busy, try again in a few minutes',
      serverNotConfigured:  'Server not configured',
      connectionOk:         'Connection OK ({latencyMs}ms)',
      connectionFail:       'Connection failed',
      // Migration form
      urlLabel:             'Target URL',
      urlPlaceholder:       'https://example.com',
      maxPages:             'Max pages',
      downloadImages:       'Download images',
      startMigration:       'Start migration',
      starting:             'Starting…',
      accuracyWarning:      'Extracted data is not 100% accurate. AI models can miss content, mislabel images or misread a site structure. This tool provides a starting point so you do not have to build from scratch. Review the result before confirming.',
      // Progress
      progressTitle:        'Extraction in progress',
      phaseLabel:           'Phase: {phase}',
      phaseFallback:        'Asking OpenAI for help, don\'t tell Elon…',
      phaseQueued:          'Queued, waiting for a free slot…',
      pagesProgress:        '{done} / {total} pages',
      stepsProgress:        'Step {done} of {total}',
      imagesImported:       '{n} image(s) imported',
      estimatedTime:        '~{seconds}s remaining',
      cancel:               'Cancel',
      cancelDialog: {
        title:   'Cancel migration?',
        message: 'The scraping job will be stopped on the server and any unsaved progress will be lost.',
        confirm: 'Yes, cancel',
        dismiss: 'Keep running',
      },
      closeDialog: {
        title:         'Migration in progress',
        message:       'A migration job is currently running. Closing this panel will not stop it on the server.',
        cancelAndClose: 'Cancel migration & close',
        stay:           'Stay',
      },
      // Result
      resultTitle:          'Result',
      coverage:             'Coverage: {pct}% · {pages} pages analyzed',
      ttlWarning:           'Expires in {minutes} min',
      // Result summary stats
      summaryPages:         '{n} pages analyzed',
      summarySections:      '{n} sections',
      summaryElements:      '{n} elements',
      summaryImages:        '{n} images',
      // Import strategy (kept for reference, not rendered)
      importTitle:          'Import as:',
      strategyBusinessOnly: 'Business data only (1 mazo, 1 record)',
      strategyWithPages:    'Business + site structure ({n} sections)',
      importButton:         'Import to Cartum',
      importingTitle:       'Importing to Cartum',
      importing:            'Importing…',
      // Confirmation
      importedTitle:        'Import completed',
      mazoCreated:          'Mazo "{name}" created',
      recordsImported:      '{n} node(s) imported',
      sectionsImported:     '{n} section(s) created',
      newMigration:         'New migration',
      viewOnBoard:          'View on board',
      // Errors
      errorJobFailed:       'Scraping failed: {message}',
      errorRetryAfter:      'Retry after ~{seconds}s',
      errorImport:          'Import failed. Try again.',
      errorNotConfigured:   'Configure API credentials first',
      errorServerBusy:      'Server is busy. Try again later.',
      errorInvalidResult:   'The Dealer didn\'t know how to deliver the cards correctly.',
      errorTimeout:         'Migration timed out after 15 minutes. The site may have too many pages.',
      errorUnknown:         'Unknown error. Please try again.',
      errorCodes: {
        LLM_AUTH_ERROR:        'Invalid AI credentials or no credits. Check your API key.',
        LLM_PARSE_ERROR:       'The AI model returned an invalid response. Please retry.',
        LLM_TIMEOUT:           'The AI model did not respond in time. Try again in a few minutes.',
        JOB_TIMEOUT:           'Job exceeded 30 minutes and was cancelled. The site may be too large.',
        INTERNAL_ERROR:        'Internal server error. Retry in ~60s.',
        RESULT_SCHEMA_MISMATCH:'Result does not match the expected structure. Please retry.',
        NO_ROUTES_FOUND:       'No pages found to analyze. The site may require JavaScript.',
        FETCH_ALL_FAILED:      'Could not download any page from the site.',
        AUDIT_CRITICAL_GAPS:   'Insufficient site coverage to complete the analysis.',
        EXTRACTION_EMPTY:      'The site has no extractable content or requires JavaScript to render.',
      },
      funMessages: [
        'Dealing cards at the speed of HTTP. Your poker face is already impressive.',
        'The Dealer is shuffling through pages like a pro. No cheating allowed.',
        'Science fact: a website with 50 pages contains approximately 50 pages.',
        'Teaching AI to read websites is like teaching a dog to play poker. It is going well.',
        'Fetching pages at warp speed. Einstein would be proud. Probably.',
        'The Dealer is reading every page. Even the Terms and Conditions. A true hero.',
        'Your cards are being sorted. No jokers were harmed in this process.',
        'The scraper found a page with 14 nested divs. It needed a moment to breathe.',
        'Cartum is converting HTML soup into beautiful Cartas. Bon appetit.',
        'The first website had zero images. Those were simpler, more honest times.',
        'The Dealer shuffles faster than your Wi-Fi. Respect the craft.',
        'The AI is reading the About Us page with genuine manufactured enthusiasm.',
        'Fun fact: nobody has ever read a cookie consent banner. Science agrees.',
        'Dealing digital cards since 2024. Zero paper cuts reported so far.',
        'The scraper is analyzing navigation menus. Big menus. Big dreams.',
        'Your Mazo is being assembled. The house always wins, but this time you do too.',
        'The AI asked for a coffee break. We told it to keep shuffling.',
        'Science suggests staring at the progress bar makes it faster. Unverified.',
        'The Dealer found a carousel slider and scrolled through it stoically.',
        'Cartum turns raw web data into structured knowledge. Basically alchemy.',
        'The scraper found a Coming Soon page. It wept briefly and moved on.',
        'Every page crawled is one Carta closer to glory. Or something poetic like that.',
        'The AI is reading meta tags. The most thrilling literature currently available.',
        'Your website just got dealt a full house. Aces in the data, baby.',
        'The Dealer does not bluff. Unlike several sites we have visited today.',
        'A developer once named their CSS class thisIsTemporary. It was not.',
        'Scraping at the speed of the server. Practically the speed of light.',
        'The robots.txt was checked. Rules were followed. Mostly.',
        'Building your Mazo one fetch at a time. Persistence is a slow virtue.',
        'The AI discovered a blog with two posts from 2019. It felt something.',
        'Cartum: turning the web into a deck of infinite possibility.',
        'The Dealer shuffled, cut the deck, and dealt your data without dropping a card.',
        'The average website has 47 broken links. We found every single one.',
        'The scraper saw a parallax effect and kept scrolling without making eye contact.',
        'Lorem ipsum is the most-read text in human civilization. Allegedly.',
        'The Dealer is on a hot streak. Seven pages of actual content in a row.',
        'Cartum believes every site has a story. Some stories are written in table tags.',
        'The AI ignores pop-ups masterfully. A skill we all should cultivate.',
        'The scraper followed a redirect politely without asking where it led.',
        'We found a footer with 11 links to the Privacy Policy. Someone really cares.',
        'The Dealer never reveals which pages it found tedious. Professional ethics.',
        'The hamsters powering the server are doing great. Hydrated and motivated.',
        'The AI read an FAQ with 87 questions. None were frequently asked.',
        'Your data is handled with the precision of a world-class card mechanic.',
        'Science confirms: good things take time. This is a loose paraphrase.',
        'The scraper is having a statistically exceptional day.',
        'Your Cartas are being filled with knowledge scraped from the digital ether.',
        'The Dealer once read a 404 page. It was the most honest page on the site.',
        'Almost there. The Dealer is finishing the shuffle. Your Cartas are nearly ready.',
        'This is fine. The data is incoming. Everything is absolutely fine.',
      ],
      docsLinkLabel: 'Web Migration documentation',
      docsLinkDesc:  'Learn how to scrape a website and import its content into Cartum as decks and cards.',
      importMessages: [
        'Creating your Mazos and Cartas. The board is being assembled.',
        'Structuring sections and attributes. Almost feels like magic.',
        'Organizing data into the node board. Patience is a virtue.',
        'Writing fields to the database. Each one placed with intent.',
        'The Cartum Dealer is placing your cards on the board.',
        'Building your site structure from scratch. Node by node.',
        'Assigning attributes to sections. Precision work in progress.',
        'Uploading images to your storage. Bytes are moving swiftly.',
        'Connecting sections to the board. The map is taking shape.',
        'Your Mazos are being populated. The board awakens.',
        'Inserting records into the node graph. Almost there.',
        'Final touches on your Cartas. Worth every millisecond.',
      ],
    },
    help: {
      title:             'Help & Feedback',
      description:       'Found a bug, vulnerability, improvement or something that could help make CartumCMS better? Send the details and if it has relevance you will receive subscription time on your account as a reward.',
      rewardNote:        'Relevant reports are rewarded with subscription time on your account.',
      subjectLabel:      'Subject',
      subjectPlaceholder:'Bug report / Security issue / Improvement…',
      emailLabel:        'Email (for communication)',
      messageLabel:      'Details',
      messagePlaceholder:'Describe the issue, steps to reproduce, expected behavior…',
      imagesLabel:       'Screenshots (optional)',
      dropZoneText:      'Drag & drop images or click to browse',
      dropZoneHint:      'JPG, PNG, WebP, GIF · max 3 MB each · up to 5 images',
      send:              'Send report',
      sending:           'Sending…',
      sent:              'Report sent. Thank you!',
      sendError:         'Could not send the report. Please try again.',
      allFieldsRequired: 'Subject, email and message are required.',
      messageTooLong:    'Message must be at most 800 characters.',
      maxImagesError:    'You can attach up to 5 images.',
      invalidTypeError:  'Only JPG, PNG, WebP and GIF images are allowed.',
      fileTooLargeError: 'Each image must be at most 3 MB.',
      rateLimited:       'You can only send 1 report per day.',
      nextAllowed:       'Next available:',
    },
    info: {
      title:          'Info',
      thankYou:       'Thank you for using Cartum CMS. We know there are many CMS options out there, but none ready to use without spending two months learning them. May Cartum power your projects, your CMS made Poker table!',
      version:        '1.0.0',
      versionLabel:   'Version',
      releasedOn:     'Released',
      releaseDate:    'April 2026',
      builtWith:      'Built with',
      stack:          'Next.js · Drizzle ORM · PostgreSQL · Cloudflare R2',
      openSource:     'Open source on GitHub',
      openSourceUrl:  'https://github.com/AzanoRivers/cartum-cms',
      developedBy:    'Developed by',
      license:        'License',
      licenseValue:   'MIT',
      docs:           'Documentation',
      docsUrl:        'https://www.azanolabs.com/cartum',
      sponsorsTitle:  'Sponsors',
      sponsors: [
        { name: 'AzanoRivers', url: 'https://azanorivers.com' },
      ],
      sponsorsCta:    'Every great project needs a little help. Become a Sponsor:',
      sponsorsXUrl:   'https://www.x.com/azanorivers',
      sponsorsXLabel: '@azanorivers on X',
    },
    db: {
      title:              'Database',
      exportTitle:        'Export project',
      exportDesc:         'Download a JSON backup of the current project: decks, cards, links, records and media. Only affects the active project.',
      exportButton:       'Export project',
      exporting:          'Exporting...',
      importTitle:        'Import project',
      importDesc:         'Restore the current project content from a backup file previously exported from Cartum.',
      importButton:       'Choose backup file',
      importing:          'Importing...',
      importOverwriteWarn:'This will replace all content in the current project (decks, cards, records, media). CMS users, roles and settings will not be affected.',
      importSuccess:      'Project imported successfully.',
      importError:        'Import failed. Use a valid project backup exported from Cartum.',
      exportWithMediaButton: 'Export with media (.zip)',
      exportWithMediaing:    'Building ZIP...',
      exportWithMediaNote:   'Includes project images and videos from Cloudflare R2 and Vercel Blob.',
      docsLinkLabel:      'Import & Export: Documentation',
      docsLinkDesc:       'Learn how project backup and restore works, file formats, and limitations.',
      exportError:        'Export failed. Please try again.',
      resetError:         'Operation failed. Please try again.',
      purgeImagesTitle:   'Delete all images',
      purgeImagesDesc:    'Permanently delete all media files (images and videos) from storage for the current project. Content, decks and records are preserved. This action only affects the active project.',
      purgeImagesButton:  'Delete all images',
      purgeImagesDialog: {
        title:         'Delete all images?',
        desc:          'This will permanently erase all images and videos of the current project from Cloudflare R2 and Vercel Blob. Media records in the database will also be removed.',
        storageNote:   'Decks, records and settings will NOT be affected.',
        placeholder:   'Type to confirm',
        confirmPhrase: 'DELETE IMAGES',
        cancel:        'Cancel',
        confirm:       'Yes, delete all images',
        confirming:    'Deleting...',
        purgedSummary: 'Files purged: {deleted}. Errors: {failed}.',
        purgeFailWarn: '{failed} file(s) could not be deleted from storage and may remain as orphans.',
      },
      resetProjectTitle:  'Reset project',
      resetProjectDesc:   'Delete all content in the current project (nodes, records, media). Users, roles and settings are kept.',
      resetProjectButton: 'Reset project',
      resetProjectDialog: {
        title:         'Reset project?',
        desc:          'This will permanently erase all nodes, records and media in this project. Users and settings will not be affected.',
        storageNote:   'All media files stored in Cloudflare R2 and Vercel Blob for this project will also be deleted.',
        placeholder:   'Type to confirm',
        confirmPhrase: 'RESET PROJECT',
        cancel:        'Cancel',
        confirm:       'Yes, reset project',
        confirming:    'Resetting...',
        purgedSummary: 'Files purged: {deleted}. Errors: {failed}.',
        purgeFailWarn: '{failed} file(s) could not be deleted from storage.',
      },
    },
    superDb: {
      title:    'Super DB',
      subtitle: 'Instance-level database operations. These actions affect ALL projects, users and settings.',
      docsLinkLabel: 'Import & Export: Documentation',
      docsLinkDesc:  'Learn about full-instance backup, restore, file formats, and limitations.',
      exportTitle:           'Export entire CMS',
      exportDesc:            'Download a full JSON backup of the ENTIRE instance: all projects, users, roles, settings and media. Includes credentials stored in app_settings.',
      exportButton:          'Super export',
      exporting:             'Exporting...',
      exportWithMediaButton: 'Super export with media (.zip)',
      exportWithMediaing:    'Building ZIP...',
      exportWithMediaNote:   'Includes ALL images and videos from every project.',
      exportError:           'Export failed. Please try again.',
      importTitle:           'Import entire CMS',
      importDesc:            'Restore the ENTIRE instance from a Super Backup. Replaces everything: all projects, users, roles and settings.',
      importButton:          'Choose Super Backup',
      importing:             'Importing...',
      importOverwriteWarn:   'This will replace ABSOLUTELY EVERYTHING in the CMS: all projects, all users, all settings. This cannot be undone.',
      importSuccess:         'CMS restored successfully from Super Backup.',
      importError:           'Import failed. Use a valid Super Backup exported from Cartum.',
      resetError:            'Reset failed. Please try again.',
      dangerTitle:           'Danger zone',
      dangerDesc:            'Permanently delete ALL data, users, projects and settings from this instance. The CMS resets to its initial state. This cannot be undone.',
      dangerButton:          'Delete all data',
      resetDialog: {
        title:         'Delete all CMS data?',
        desc:          'This will permanently erase all users, projects, decks, records, media and settings. The CMS instance will restart from zero.',
        storageNote:   'All files stored in Cloudflare R2 and Vercel Blob will also be permanently deleted.',
        placeholder:   'Type to confirm',
        confirmPhrase: 'DELETE PERMANENTLY',
        cancel:        'Cancel',
        confirm:       'Yes, delete everything',
        confirming:    'Deleting...',
        purgedSummary: 'Files purged: {deleted}. Errors: {failed}.',
        purgeFailWarn: '{failed} file(s) could not be deleted from storage and may remain as orphans.',
      },
    },
    variables: {
      title:       'Instance Variables',
      subtitle:    'Global default values for this CMS instance. Per-project overrides set in each section take precedence.',
      saveButton:  'Save',
      saving:      'Saving…',
      saved:       'Saved.',
      clearButton: 'Reset to env',
      clearDesc:   'Remove the stored override and revert to the .env value.',
      overrideBadge: 'Override',
      envBadge:      'From .env',
      readOnlyNote:  'Read-only. Requires app restart to change.',
      show:          'Show',
      hide:          'Hide',
      // Groups
      groupStorage:  'Storage',
      groupR2:       'Cloudflare R2',
      groupBlob:     'Vercel Blob',
      groupEmail:    'Email',
      groupResend:   'Resend',
      groupSes:      'AWS SES',
      groupScraper:  'Scraper API',
      groupAuth:     'Auth & Database',
      groupMisc:     'Misc',
      varConfigured:    'Configured',
      varNotConfigured: 'Not configured',
      // Field labels
      r2Endpoint:      'R2 Endpoint',
      r2AccessKeyId:   'Access Key ID',
      r2SecretKey:     'Secret Access Key',
      r2BucketName:    'Bucket Name',
      r2PublicUrl:     'Public URL',
      blobToken:       'Blob Token',
      resendApiKey:       'Resend API Key',
      resendFromEmail:    'From Email',
      sesAccessKeyId:     'AWS SES Access Key ID',
      sesSecretAccessKey: 'AWS SES Secret Access Key',
      scraperApiUrl:   'Scraper URL',
      scraperApiKey:   'Scraper API Key',
      cartumNewPlayer: 'CARTUM_NEW_PLAYER',
      authUrl:         'AUTH_URL',
      dbProvider:      'DB_PROVIDER',
      databaseUrl:     'DATABASE_URL',
      cartumNewPlayerHint:        'Set to "true" to enable the public registration page.',
      cartumNewPlayerLinkLabel:   'View registration page →',
      resetAllButton:      'Reset all to .env defaults',
      resetAllConfirmTitle: 'Reset all variables?',
      resetAllConfirmDesc:  'This will remove all stored overrides. The CMS will revert to the values defined in the .env file.',
      resetAllSuccess:     'All variables reset to .env defaults.',
    },
    subscription: {
      title:       'Subscription',
      description: 'Here you will manage your Cartum CMS subscription. AzanoLabs is currently supported solely by AzanoRivers and it\'s a tremendous effort. Your support is an incredible play!',
      comingSoon:  'Coming soon',
    },
    cartumProjects: {
      title:          'Cartum Projects',
      subtitle:       'All projects registered in this Cartum instance. Only super admins can see this section.',
      ownerLabel:              'Owner',
      roleSuperAdmin:          'Super Admin',
      createdLabel:            'Created',
      memberSingular:          'member',
      memberPlural:            'members',
      subActive:               'Active',
      subExpired:              'Expired',
      images:                  'images',
      videos:                  'videos',
      noMedia:                 'No media',
      filterSearch:            'Search by name…',
      filterSortLabel:         'Sort by',
      sortName:                'Name',
      sortMembers:             'Members',
      sortFiles:               'Files',
      sortSize:                'Size',
      sortCreated:             'Created',
      noResults:               'No projects match the filter.',
      noProjects:              'No projects found.',
      cannotDeleteSuperAdmin:  'Super admin projects cannot be deleted from this screen.',
      deleteButton:            'Delete',
      deleting:                'Deleting...',
      deleteSuccess:           'Project deleted.',
      deleteError:             'Could not delete project.',
      docsLinkLabel: 'Multi-project documentation',
      docsLinkDesc:  'Learn how multiple Cartum projects coexist in the same instance and how to manage them.',
      confirmDialog: {
        title:         'Delete project "{name}"?',
        desc:          'This will permanently delete the project, all its content (decks, cards, records, media files) and all non-super-admin users who belong exclusively to this project.',
        superAdminNote: 'Super admin accounts will NOT be deleted.',
        placeholder:   'Type to confirm',
        confirmPhrase: 'DELETE PROJECT',
        cancel:        'Cancel',
        confirm:       'Yes, delete project',
        confirming:    'Deleting...',
      },
    },
    defaults: {
      title:       'Defaults',
      subtitle:    'Configure default providers for the entire CMS, not per project. These options apply to all projects in this instance.',
      emailSection: 'Email Provider',
      emailDesc:   'Select the default email provider for all outgoing emails in this instance.',
      resend:            'Resend',
      ses:               'AWS SES',
      active:            'Active',
      configured:        'Configured',
      notConfigured:     'Not configured',
      notConfiguredError:'Provider not configured — configure credentials first.',
      setAsDefault:      'Set as default',
      defaultBadge:      'Default',
      testEmail:         'Send test',
      testing:           'Sending…',
      testOk:            'Test email sent.',
      testFail:          'Test failed.',
      testToLabel:       'Destination email for test',
      testToPlaceholder: 'email@example.com',
      testToRequired:    'Enter a destination email to send the test.',
      storageSection:         'Storage Provider',
      storageDesc:            'Select the default storage provider for new media uploads across all projects without a local override.',
      storageNotConfiguredNote: 'No storage provider is configured globally. Set credentials in Settings → Variables first.',
      resendFromEmailLabel:   'RESEND_FROM_EMAIL (global default)',
      resendFromEmailWarning: 'Must be from a verified domain in your Resend account.',
      sesFromEmailLabel:      'AWS_SES_FROM_EMAIL (global default)',
      sesFromEmailWarning:    'The sender domain must be verified in AWS SES. Unverified domains will cause delivery failures.',
      testSectionTitle:       'Send test email',
      save:        'Save',
      saving:      'Saving...',
      saved:       'Default saved.',
      error:       'Could not save default.',
    },
  },
  email: {
    poweredBy: 'Powered by',
    reset: {
      subject:    'Reset your Cartum password',
      heading:    'Password reset requested',
      intro:      'Someone requested a password reset for your Cartum account. Click the button below to continue. This link is valid for 1 hour.',
      cta:        'RESET PASSWORD',
      urlFallback: "If the button doesn't work, copy and paste this link into your browser:",
      ignore:     "If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.",
    },
    welcome: {
      subjectWith:     'Welcome to Cartum · {project}',
      subjectFallback: 'Welcome to Cartum',
      titleWith:       'Welcome to {project}',
      titleFallback:   'Welcome to Cartum',
      subtitle:        'Your admin account has been created. Below are your access credentials.',
      partOf:          'You are now part of {project}.',
      saveNotice:      'Save them now. This password will not be shown again.',
      labelEmail:      'EMAIL',
      labelPassword:   'PASSWORD',
      warning:         'Store this password in a password manager. For security reasons, it will not be accessible after this email.',
      cta:             'OPEN DASHBOARD',
      note:            'You can change your password at any time from your account settings after logging in.',
    },
    verifyEmail: {
      subject: 'Your Cartum verification code: {code}',
      heading: 'Confirm your email change',
      intro:   'Use the code below to verify your new email address on Cartum.',
      expiry:  'This code expires in 10 minutes.',
      ignore:  "If you didn't request this change, you can safely ignore this email.",
    },
  },
} satisfies Dictionary

export type Dictionary = {
  setup: {
    stepLabels: [string, string, string, string, string, string, string]
    layout: { back: string }
    systemCheck: {
      title: string; subtitle: string; db: string; env: string
      schema: string; storageLabel: string; storageWarning: string
      blobLabel: string; blobWarning: string
      optimusLabel: string; optimusWarning: string
      scraperLabel: string; scraperWarning: string
      allOk: string; continue: string; fixFirst: string
    }
    locale: { title: string; subtitle: string; continue: string }
    credentials: {
      title: string; subtitle: string; email: string
      generatedPassword: string; passwordNotice: string
      regenerate: string; copy: string; copied: string
      show: string; hide: string; continue: string
      errors: { email: string; password: string }
    }
    project: {
      title: string; subtitle: string; name: string
      namePlaceholder: string; description: string
      descriptionPlaceholder: string; continue: string
    }
    theme: {
      title: string; subtitle: string; continue: string
      themes: {
        dark:       { label: string; description: string }
        cyberSoft:  { label: string; description: string }
        light:      { label: string; description: string }
        dusk:       { label: string; description: string }
        matrix:     { label: string; description: string }
        cyberHuman:     { label: string; description: string }
        strangerThings: { label: string; description: string }
      }
    }
    initializing: {
      title: string
      steps: [string, string, string, string]
      done: string
    }
    ready: {
      title: string; project: string; admin: string
      status: string; statusVal: string; cta: string
    }
  }
  auth: {
    login: {
      title: string; email: string; password: string
      show: string; hide: string; submit: string; submitting: string
      error: string; forgotPassword: string; noAccount: string; createAccount: string
      captchaLabel: string; captchaPlaceholder: string; captchaError: string
      loginSuccess: string; accountDisabled: string
      emailRequired: string; passwordRequired: string
    }
    forgotPassword: {
      title: string; subtitle: string; email: string
      submit: string; submitting: string; success: string
      backToLogin: string; noEmailWarning: string
      captchaLabel: string; captchaPlaceholder: string; captchaError: string
      rateLimited: string; emailRequired: string
    }
    resetPassword: {
      title: string; subtitle: string; newPassword: string
      confirmPassword: string; submit: string; submitting: string
      successToast: string; errorGeneric: string
    }
    invite: {
      title: string; subtitle: string; subtitleAs: string
      expired: string; consumed: string
      wrongAccount: string; wrongAccountHint: string
      signedInAs: string; acceptButton: string; accepting: string
      signInTitle: string; registerTitle: string
      passwordLabel: string; passwordPlaceholder: string
      passwordShow: string; passwordHide: string
      passwordRegenerate: string; passwordCopy: string; passwordCopied: string
      passwordNotice: string
      createButton: string; creating: string
      emailLabel: string; signInButton: string; signingIn: string
      goToLogin: string
      roleLabels: Record<string, string>
    }
  }
  cms: {
    topBar: { account: string; logOut: string; userMenuAriaLabel: string; freeTier: string; trialDaysLeft: string; trialTooltip: string }
    projectSelector: { newProject: string; ariaLabel: string }
    noProject: { title: string; desc: string; button: string }
    newProjectModal: {
      title: string; nameLabel: string; namePlaceholder: string
      descriptionLabel: string; descriptionPlaceholder: string
      localeLabel: string; localeEn: string; localeEs: string
      cancel: string; create: string; creating: string
      next: string; back: string; step1: string; step2: string; themeLabel: string
    }
    player: {
      welcome: string; langSelect: string
      createAccountTab: string; stepCredentials: string; stepProject: string; stepTheme: string
      emailLabel: string; emailPlaceholder: string
      passwordLabel: string; passwordPlaceholder: string
      generatePassword: string; copyPassword: string; copiedPassword: string
      projectLabel: string; projectPlaceholder: string
      descriptionLabel: string; descriptionPlaceholder: string
      projectLocaleLabel: string
      themeLabel: string
      themes: { dark: string; 'cyber-soft': string; light: string; dusk: string; matrix: string; 'cyber-human': string; 'stranger-things': string }
      next: string; submit: string; submitting: string; back: string
      showPassword: string; hidePassword: string
      alreadyHaveAccount: string; signIn: string; disabled: string
    }
    dock:   { settings: string; home: string; content: string; create: string; backToBuilder: string; help: string; collapse: string; expand: string }
    help: {
      title: string; shortcutsTitle: string; gesturesTitle: string; boardTitle: string; close: string
      categoryNav: string; categoryPanels: string; categoryGestures: string
      shortcuts: {
        goHome:       { keys: string; description: string }
        goContent:    { keys: string; description: string }
        newNode:      { keys: string; description: string }
        openSettings: { keys: string; description: string }
        closeOverlay: { keys: string; description: string }
      }
      gestures: {
        singleTap:  { icon: string; description: string }
        doubleTap:  { icon: string; description: string }
        longPress:  { icon: string; description: string }
        portDrag:   { icon: string; description: string }
        pinch:      { icon: string; description: string }
        panCanvas:  { icon: string; description: string }
      }
      board: {
        pan:       { icon: string; description: string }
        marquee:   { icon: string; description: string }
        multiAdd:  { icon: string; description: string }
        multiMove: { icon: string; description: string }
        multiDel:  { icon: string; description: string }
        multiEsc:  { icon: string; description: string }
      }
      docsButton: string
    }
    docs: {
      title: string
      breadcrumb: string
      sidebarAriaLabel: string
      sections: {
        gettingStarted: string; navigation: string; nodesAndFields: string
        content: string; webMigration: string; relationsGuide: string; rolesGuide: string; multiProject: string
        media: string; apiForDevs: string; apiSchema: string; relations: string; nodesAndFieldsDev: string; webMigrationDev: string; multiProjectDev: string
        storageSetup: string
        usersGuide: string
        emailSetup: string
        installation: string
        importExport: string
      }
      userBadge: string
      devBadge: string
      gettingStarted: {
        title: string; welcome: string; intro: string; conceptsTitle: string
        concepts: { node: string; field: string; record: string; connection: string }
        flowTitle: string; flow: string
        installLink: string
      }
      navigation: {
        title: string; dockTitle: string; dockDesc: string
        boardLabel: string; boardDesc: string; contentLabel: string; contentDesc: string
        shortcutsTitle: string
        shortcuts: { goHome: string; goContent: string; newNode: string; openSettings: string; closeOverlay: string }
        gesturesTitle: string
        gestures: { singleTap: string; doubleTap: string; longPress: string; pinch: string; pan: string }
      }
      nodesAndFields: {
        title: string; deckTitle: string; deckDesc: string
        cardAttrTitle: string; cardAttrDesc: string; attrTypesTitle: string
        attrTypes: { text: string; number: string; toggle: string; image: string; video: string; gallery: string; relation: string }
        note: string
      }
      nodesAndFieldsDev: {
        title: string; intro: string
        nodeTitle: string; nodeDesc: string
        fieldTitle: string; fieldDesc: string
        fieldNamingTitle: string; fieldNamingDesc: string
        fieldTypesTitle: string
        fieldTypes: { text: string; number: string; boolean: string; image: string; video: string; gallery: string; relation: string }
        requiredTitle: string; requiredDesc: string
        note: string
      }
      importExport: {
        title: string; intro: string
        projectTitle: string; projectDesc: string
        exportTitle: string
        exportSteps: { s1: string; s2: string; s3: string; s4: string }
        importTitle: string; importDesc: string
        importSteps: { s1: string; s2: string; s3: string; s4: string; s5: string }
        importWarnTitle: string; importWarn: string
        superTitle: string; superDesc: string
        superExportTitle: string
        superExportSteps: { s1: string; s2: string; s3: string; s4: string }
        superImportTitle: string
        superImportSteps: { s1: string; s2: string; s3: string }
        superImportWarn: string
        mediaNote: string
        formatTitle: string; formatProject: string; formatSuper: string
      }
      content: {
        title: string; step1: string; step2: string
        newRecord: string; editRecord: string; deleteRecord: string
        validationNote: string; mediaNote: string
      }
      webMigration: {
        title: string; intro: string
        howTitle: string; howItems: { a: string; b: string; c: string; d: string }
        whatYouGetTitle: string; whatYouGetItems: { a: string; b: string; c: string }
        aiNote: string
        bestForTitle: string; bestForItems: { a: string; b: string; c: string }
        startTitle: string; startDesc: string
        accuracyWarning: string
      }
      webMigrationDev: {
        title: string; intro: string
        crawlTitle: string; crawlDesc: string
        pipelineTitle: string
        pipelineItems: { nav: string; fetch: string; extract: string; catalog: string; audit: string; ai: string; import: string }
        stackTitle: string; stackItems: { a: string; b: string; c: string; d: string }
        configTitle: string; configDesc: string
        aiNote: string
        accuracyWarning: string
        officialDocsTitle: string; officialDocsDesc: string; officialDocsLink: string; officialDocsUrl: string
      }
      relationsGuide: {
        title: string; intro: string
        whatTitle: string; whatDesc: string
        whyTitle: string; whyItems: { a: string; b: string; c: string }
        exampleTitle: string; exampleDesc: string
        howTitle: string; how1: string; how2: string; how3: string
        contentTitle: string; contentDesc: string
        note: string
      }
      rolesGuide: {
        title: string; intro: string
        defaultRolesTitle: string
        roles: {
          admin:      { name: string; desc: string }
          editor:     { name: string; desc: string }
          viewer:     { name: string; desc: string }
          restricted: { name: string; desc: string }
        }
        projectScopeTitle: string; projectScopeDesc: string
        newProjectTitle: string; newProjectDesc: string
        inviteTitle: string; inviteDesc: string
        superAdminTitle: string; superAdminDesc: string
        switchNote: string
      }
      media: {
        title: string; galleryTitle: string; galleryDesc: string
        optimTitle: string; optimImages: string; optimVideos: string; optimFallback: string
        limitsTitle: string; limitImages: string; limitVideos: string; configNote: string
        vpsTitle: string; vpsIntro: string
        vpsItem1: string; vpsItem2: string; vpsItem3: string; vpsItem4: string
        vpsTtlNote: string
        storageTitle: string; storageIntro: string; storageR2: string; storageBlob: string
        storageSwitchTitle: string; storageSwitch: string; storageBackcompat: string
        storageVideoLimitsTitle: string; storageVideoLimitsBlob: string; storageVideoLimitsR2: string
      }
      apiForDevs: {
        title: string; intro: string
        tokenTitle: string; tokenStep1: string; tokenStep2: string; tokenStep3: string; tokenStep4: string; tokenStep5: string; tokenStep6: string
        authTitle: string; authNote: string; baseUrlTitle: string
        deckSlugTitle: string; deckSlugDesc: string; scopeTitle: string; scopeDesc: string
        endpointsTitle: string
        endpoints: { schema: string; getSchemaDeck: string; getDeck: string; getCard: string; listRecords: string; getRecord: string; createRecord: string; putRecord: string; patchRecord: string; deleteRecord: string }
        endpointPermissions: { anyToken: string; read: string; write: string; update: string; delete: string }
        putVsPatchNote: string; canvasNote: string; queryParamsTitle: string
        params: {
          page:    { name: string; type: string; default: string; desc: string }
          limit:   { name: string; type: string; default: string; desc: string }
          sort:    { name: string; type: string; default: string; desc: string }
          order:   { name: string; type: string; default: string; desc: string }
          filter:  { name: string; type: string; default: string; desc: string }
          include: { name: string; type: string; default: string; desc: string }
        }
        responseListTitle: string; responseRecordTitle: string
        includeTitle: string; includeDesc: string; errorsTitle: string
        errors: {
          badRequest:   { code: string; name: string; desc: string }
          unauthorized: { code: string; name: string; desc: string }
          forbidden:    { code: string; name: string; desc: string }
          notFound:     { code: string; name: string; desc: string }
          validation:   { code: string; name: string; desc: string }
          noContent:    { code: string; name: string; desc: string }
        }
        examplesTitle: string; examplesNote: string
      }
      apiSchema: {
        title: string; intro: string; endpointLabel: string; anyTokenNote: string
        responseTitle: string; fieldsTableTitle: string
        fields: {
          id:           { name: string; type: string; desc: string }
          name:         { name: string; type: string; desc: string }
          type:         { name: string; type: string; desc: string }
          required:     { name: string; type: string; desc: string }
          defaultValue: { name: string; type: string; desc: string }
          relatesTo:    { name: string; type: string; desc: string }
        }
        exampleLabel: string
      }
      relations: {
        title: string; intro: string
        flatPrincipleTitle: string; flatPrincipleDesc: string
        inheritanceTitle: string; inheritanceDesc: string
        relationTypesTitle: string
        types: {
          oneToOne:   { label: string; desc: string }
          oneToMany:  { label: string; desc: string }
          manyToMany: { label: string; desc: string }
        }
        multipleRelationsTitle: string; multipleRelationsDesc: string
        antiCycleTitle: string; antiCycleDesc: string
        consumingTitle: string
        consumingSteps: { step1: string; step2: string; step3: string; step4: string }
        exampleTitle: string; exampleNote: string
      }
      multiProject: {
        title: string; intro: string
        tableTitle: string; tableDesc: string
        switchTitle: string; switchDesc: string
        newTableTitle: string; newTableDesc: string
        playersTitle: string; playersDesc: string
        languageTitle: string; languageDesc: string
        note: string
      }
      multiProjectDev: {
        title: string; intro: string
        capsuleTitle: string; capsuleDesc: string
        sessionTitle: string; sessionDesc: string
        localeTitle: string; localeDesc: string
        superAdminTitle: string
        superAdminItems: { one: string; apiKey: string; blob: string; access: string; delete: string }
        regularAdminTitle: string
        regularAdminItems: { role: string; storage: string; apiKey: string; scope: string }
        apiKeysTitle: string; apiKeysDesc: string
        storageTitle: string
        storageHeaders: [string, string, string]
        storageR2: [string, string, string]
        storageBlob: [string, string, string]
        setupNote: string
      }
      storageSetup: {
        title: string; intro: string
        r2Title: string; r2Intro: string; r2Steps: Record<string, string>
        r2EnvTitle: string; r2EnvVars: Record<string, string>
        r2CorsTitle: string; r2CorsNote: string
        blobTitle: string; blobIntro: string; blobSteps: Record<string, string>
        blobEnvTitle: string; blobEnvVar: string
        switchTitle: string; switchIntro: string; switchItems: Record<string, string>
        fallbackTitle: string; fallbackIntro: string; fallbackItems: Record<string, string>
        defaultsTitle: string; defaultsIntro: string
        scopeNote: string
      }
      emailSetup: {
        title: string; intro: string
        howTitle: string; howItems: Record<string, string>
        resendTitle: string; resendIntro: string; resendSteps: Record<string, string>
        resendEnvTitle: string; resendEnvVars: Record<string, string>; resendNote: string
        sesTitle: string; sesIntro: string; sesSteps: Record<string, string>
        sesEnvTitle: string; sesEnvVars: Record<string, string>; sesNote: string
        uiTitle: string; uiIntro: string; uiItems: Record<string, string>
        scopeNote: string; docsLink: string; docsLinkSes: string
      }
      usersGuide: {
        title: string; intro: string
        superAdminTitle: string; superAdminIntro: string; superAdminHow: string; superAdminHowDesc: string; superAdminNote: string
        adminTitle: string; adminIntro: string; adminNote: string
        comparisonTitle: string
        comparisonHeaders: { feature: string; superAdmin: string; admin: string }
        comparison: Record<string, { feature: string; sa: string; adm: string }>
        localVsCloudTitle: string; localVsCloudItems: Record<string, string>
        securityNote: string
      }
      installation: {
        title: string; intro: string
        quickTitle: string; quickDesc: string; quickThenTitle: string
        manualTitle: string; manualSteps: Record<string, string>
        envTitle: string; envRequired: string; envOptional: string
        envVars: Record<string, string>
        scriptsTitle: string; scripts: Record<string, string>
        prereqTitle: string; prereqs: Record<string, string>
        repoNote: string
      }
    }
    canvas: { ariaLabel: string; loading: string; empty: string; emptyHint: string; multiSelected: string; multiSelectedHint: string }
    nodeCard: {
      fields: string; records: string; connections: string; required: string
      types: { text: string; number: string; boolean: string; image: string; video: string; gallery: string; relation: string }
    }
    creation: {
      ariaLabel: string; titleTypeSelect: string; titleFieldType: string; titleName: string
      containerLabel: string; containerDesc: string; fieldLabel: string; fieldDesc: string
      nodeName: string; placeholder: string; back: string; create: string
      errors: { nameRequired: string; nameTaken: string }
    }
    fieldTypePicker: { text: string; number: string; boolean: string; image: string; video: string; relation: string; gallery: string }
    fieldEdit: {
      ariaLabel: string; title: string; name: string; requiredToggle: string
      fieldType: string; cancel: string; save: string; saving: string; typeChangeBlocked: string
      typeChangeConfirmTitle: string; typeChangeConfirmBody: string; typeChangeConfirmSubtext: string; typeChangeConfirm: string
      text:    { multiline: string; maxLength: string; maxLengthPlaceholder: string; defaultValueLabel: string; defaultValuePlaceholder: string; richTextBold: string; richTextBoldTip: string; richTextItalic: string; richTextItalicTip: string; richTextTitle: string; richTextTitleTip: string; richTextAlignLeft: string; richTextAlignCenter: string; richTextAlignRight: string; richTextColor: string; richTextColorTip: string; richTextLink: string; richTextLinkTip: string; richTextLinkTextLabel: string; richTextLinkUrlLabel: string; richTextLinkInsert: string; richTextLinkCancel: string; richTextHtml: string; richTextHtmlTip: string; richTextHtmlCodeLabel: string; richTextHtmlInsert: string; richTextHtmlCancel: string; richTextClear: string; richTextClearTip: string }
      number:  { subtype: string; subtypeInt: string; subtypeFloat: string; valueModeLabel: string; valueModeFixed: string; valueModeRange: string; fixedValue: string; fixedValuePlaceholder: string; min: string; max: string; minPlaceholder: string; maxPlaceholder: string; rangeError: string }
      boolean: { defaultValue: string; trueLabel: string; falseLabel: string; truePlaceholder: string; falsePlaceholder: string }
      storage: { notConfiguredImages: string; notConfiguredVideos: string; configuredImages: string; configuredVideos: string; imageFormats: string; videoFormats: string; goToContent: string }
      relation:{ targetLabel: string; targetPlaceholder: string; relationType: string }
      errors:  { nameRequired: string; nameInvalid: string; nameTaken: string; relTargetRequired: string; unknown: string }
      accordion: { typeSection: string; contentSection: string }
      mediaContent: {
        noImage: string; noVideo: string; dragOrSelect: string; dropHere: string
        selectFromLib: string; uploadNew: string; changeMedia: string; removeMedia: string
        confirmRemove: string; otherTypesMsg: string; uploading: string; optimizing: string; uploadError: string
        fromUrl: string; urlPlaceholder: string
      }
      gallery: { maxItems: string; maxItemsPlaceholder: string }
      galleryContent: {
        addImage: string; removeImage: string; confirmRemove: string
        selectFromLib: string; uploadNew: string; empty: string; maxReached: string
        uploading: string; optimizing: string; uploadError: string
        fromUrl: string; urlPlaceholder: string; addAnotherUrl: string; addUrls: string
      }
    }
    mobileList: { empty: string; emptyHint: string; fieldsSeparator: string }
    content: {
      title: string
      backToContent: string
      index: { emptyOwn: string; records: string; browse: string }
      list: {
        newRecord: string; search: string; noResults: string; empty: string
        createdAt: string; editAriaLabel: string; deleteAriaLabel: string
        confirmDelete: string; confirmYes: string; confirmNo: string
      }
      form: {
        newTitle: string; editTitle: string; save: string; saving: string; discard: string
        errors: { required: string; invalidNumber: string; numberRange: string; relRequired: string; unknown: string }
      }
      upload: {
        storageNotConfigured: string; imageFormats: string; videoFormats: string
        dragOrClick: string; uploading: string; change: string; remove: string
        chooseFromLibrary: string; uploadNew: string
        uploadSuccess: string; uploadError: string; invalidType: string; fileTooLarge: string
        tier1ImageWarn: string; tier1VideoWarn: string
        vpsUnreachable: string; vpsAuthError: string; vpsAuthErrorDesc: string
        vpsValidationWarn: string; vpsTimeout: string; vpsPartial: string
        videoProcessing: string
        mediaLibraryTitle: string; searchPlaceholder: string
        sortNewest: string; sortOldest: string
        emptyLibrary: string; emptySearch: string; selectAsset: string; loadingMore: string
      }
      relation: { placeholder: string; noOptions: string }
      mediaGallery: {
        title: string; tabImages: string; tabVideos: string; searchPlaceholder: string
        uploadBtn: string; emptyImages: string; emptyVideos: string; emptySearch: string
        noUploadAccess: string
        dropHere: string; orClick: string; uploadStart: string
        optimizing: string; uploading: string; uploadSuccess: string; uploadError: string
        deleteLabel: string; confirmDelete: string; deleteSuccess: string; deleteError: string; copyUrlLabel: string; copiedLabel: string
        ofLabel: string; perPageLabel: string
        vpsUnreachable: string; vpsAuth: string; vpsTimeout: string
        vpsValidation: string; vpsPartial: string; vpsQueueFull: string
        bulkPlaceholder: string; bulkDownload: string; bulkDelete: string
        bulkSelected: string; bulkClear: string
        bulkDeleteTitle: string; bulkDeleteBody: string; bulkDeleteConfirm: string
        bulkDeleteCancel: string; bulkDeleting: string
        bulkDeletedSuccess: string; bulkDeletedPartial: string
        bulkDownloading: string; bulkDownloadSuccess: string
        imageLimitError: string; videoLimitError: string; duplicateError: string
        uploadedBatch: string; uploadErrorBatch: string; compressionBatch: string
        videoUploadWarning: string
        videoSizeError: string; videoChunking: string; videoProcessing: string
        videoFinalizing: string; videoVpsSkipped: string
        videoBlobTooLarge: string; videoBlobFallbackFail: string
        videoFallbackTitle: string; videoFallbackBody: string
        videoFallbackUpload: string; videoFallbackCancel: string
        imageFallbackTitle: string; imageFallbackBody: string
        imageFallbackUpload: string; imageFallbackCancel: string
        estimatedTimeLabel: string; estimatedSecsUnit: string; estimatedMinsUnit: string
        finalizingSoonLabel: string
        imageUploadWarning: string
        uploadCancelConfirmTitle: string; uploadCancelConfirmDesc: string
        uploadCancelConfirmYes: string; uploadCancelConfirmNo: string
      }
    }
    board: {
      title: string
      canvasMenu: { back: string; forward: string; fitAll: string; createDeck?: string }
      contextMenu: { rename: string; duplicate: string; deleteNode: string; back?: string; forward?: string; fitAll?: string }
      deleteDialog: {
        title: string; safeMessage: string; warnMessage: string; dangerMessage: string
        cancel: string; confirm: string; confirmDanger: string; deleting: string
        factorChildren: string; factorConnections: string
        factorRecordsContainer: string; factorRecordsField: string; factorRelations: string
      }
      toast: {
        duplicateSuccess: string; duplicateError: string
        deleteSuccess: string; deleteError: string; deleteFieldSuccess: string; deleteFieldError: string; checkRiskError: string
        renameSuccess: string; renameError: string
      }
      renameDialog: {
        title: string; label: string; placeholder: string
        cancel: string; save: string; saving: string
      }
    }
    notFound: { title: string; message: string; back: string }
  }
  settings: {
    panelTitle: string
    loading:    string
    nav: {
      account: string; appearance: string; project: string; subscription: string; storage: string; email: string
      api: string; members: string; users: string; roles: string; info: string; db: string; webMigration: string
      cartumProjects: string; variables: string; defaults: string; help: string; superDb: string
    }
    help: {
      title: string; description: string; rewardNote: string
      subjectLabel: string; subjectPlaceholder: string
      emailLabel: string; messageLabel: string; messagePlaceholder: string
      imagesLabel: string; dropZoneText: string; dropZoneHint: string
      send: string; sending: string; sent: string; sendError: string
      allFieldsRequired: string; messageTooLong: string
      maxImagesError: string; invalidTypeError: string; fileTooLargeError: string
      rateLimited: string; nextAllowed: string
    }
    defaults: {
      title: string; subtitle: string
      emailSection: string; emailDesc: string
      resend: string; ses: string; active: string
      configured?: string; notConfigured?: string; notConfiguredError?: string
      setAsDefault?: string; defaultBadge?: string
      testEmail?: string; testing?: string; testOk?: string; testFail?: string
      testToLabel?: string; testToPlaceholder?: string; testToRequired?: string
      sesFromEmailLabel?: string; sesFromEmailWarning?: string
      resendFromEmailLabel?: string; resendFromEmailWarning?: string
      testSectionTitle?: string
      storageSection?: string; storageDesc?: string; storageNotConfiguredNote?: string
      save: string; saving: string; saved: string; error: string
    }
    appearance: {
      title: string; themeLabel: string; saved: string; saveError: string
      themes: {
        dark:       { label: string; description: string }
        cyberSoft:  { label: string; description: string }
        light:      { label: string; description: string }
        dusk:       { label: string; description: string }
        matrix:     { label: string; description: string }
        cyberHuman:     { label: string; description: string }
        strangerThings: { label: string; description: string }
      }
    }
    project: {
      title: string; projectName: string; description: string; descriptionPlaceholder: string; defaultLocale: string
      localeEn: string; localeEs: string
      save: string; saving: string; saved: string; error: string
      selectProject: string; noProjects: string
      dangerZone: string; dangerDesc: string; onlyOwnerCanDelete: string; deleteProject: string; deleting: string; deleteSuccess: string; deleteError: string; singleProjectWarning: string
      docsLinkLabel: string; docsLinkDesc: string
      confirmDialog: { title: string; message: string; inputLabel: string; confirmPhrase: string; confirm: string; cancel: string }
    }
    storage: {
      title: string; projectScopeNote: string
      r2SectionTitle: string
      r2Endpoint: string; r2EndpointPlaceholder: string
      r2AccessKeyId: string; r2AccessKeyIdPlaceholder: string
      r2SecretAccessKey: string; r2SecretAccessKeyPlaceholder: string
      r2BucketName: string; r2BucketNamePlaceholder: string
      r2PublicUrl: string; r2PublicUrlPlaceholder: string
      r2DocsLink: string; r2Warning: string
      blobSectionTitle: string
      blobToken: string; blobTokenPlaceholder: string; blobTokenHint: string
      blobDocsLink: string; blobWarning: string
      testBlob: string; testBlobOk: string; testBlobFail: string
      vpsSectionTitle: string; mediaVpsUrl: string; mediaVpsUrlPlaceholder: string
      mediaVpsUrlLocked: string; mediaVpsKey: string; mediaVpsWarning: string; apiDocsLink: string
      fieldSet: string; fieldNotSet: string; fieldReplaceLabel: string
      showKey: string; hideKey: string
      testConnection: string; testing: string; testOk: string; testFail: string
      providerLabel: string; providerR2: string; providerBlob: string
      providerSaved: string; providerError: string; providerSelectHint: string; providerSelectHintAdmin?: string; providerMissingCredentials?: string; providerUnsaved?: string; saveProviderBtn?: string
      statusConfigured: string; statusNotConfigured: string; statusActive: string
      save: string; saving: string; saved: string; error: string; saveEmptyNotice: string
      docsLinkLabel: string; docsLinkDesc: string
    }
    email: {
      title: string; docsLinkLabel: string; docsLinkDesc: string; notConfigured: string
      providerLabel: string; active: string; inactive: string; configured: string; notConfiguredBadge: string
      resendTab: string; sesTab: string
      resendApiKey: string; resendKeyPlaceholder: string
      apiKeySet: string; apiKeyNotSet: string
      apiKeyReplaceLabel: string; apiKeyReplacePlaceholder: string
      sesAccessKeyId: string; sesSecretKey: string; sesKeyPlaceholder: string; sesSecretPlaceholder: string
      fromEmailLabel: string; fromEmailHint: string; fromEmailDomainWarning: string
      sesFromEmailLabel?: string; sesFromEmailDomainWarning?: string
      providerSwitchWarning?: string; providerSwitchError?: string
      unsavedProvider?: string; saveProvider?: string
      testToPlaceholder?: string
      testEmail: string; testing: string; testOk: string; testFail: string
      save: string; saving: string; saved: string; error: string
      projectScopeNote: string
    }
    api: {
      title: string; tokenListTab: string; newTokenTab: string
      tokenName: string; lastUsed: string; expiresCol: string
      never: string; revoke: string; revoking: string; revokeSuccess: string
      newTokenTitle: string; nameLabel: string; namePlaceholder: string; expiresLabel: string
      createButton: string; creating: string; createSuccess: string; createError: string
      copyToken: string; copied: string; tokenOnceNotice: string; confirmCopied: string
      close: string; empty: string
      scopeLabel: string; scopeRead: string; scopeWrite: string; scopeUpdate: string; scopeDelete: string; scopeCol: string
      exclusionsLabel: string; addExclusion: string; exclusionsHint: string
      searchDecks: string; noDecksFound: string; removeExclusion: string
      exclusionModalTitle: string; exclusionModalClose: string; exclusionConfirm: string
      docsLinkLabel: string; docsLinkDesc: string
    }
    members: {
      title: string; subtitle: string; docsLinkLabel: string; docsLinkDesc: string; inviteLabel: string
      emailLabel: string; projectLabel: string; roleLabel: string
      emailPlaceholder: string; inviting: string; inviteButton: string; inviteSuccess: string
      builtInRoleLabels: { admin: string; editor: string; viewer: string }
      currentMembers: string; memberSingular: string; memberPlural: string
      pendingTitle: string; pending: string
      noPending: string; resend: string; revoke: string; revokeConfirm: string
      resendSuccess: string; revokeSuccess: string
      ownerLabel: string; youLabel: string; changeRole: string; removeButton: string
      removeConfirmTitle: string; removeConfirmDesc: string
      removeSuccess: string; removeError: string; roleUpdated: string; noMembers: string
    }
    users: {
      title: string; subtitle: string; empty: string; noResults: string; youLabel: string
      colCreated: string; colProjects: string; colOwned: string; colSub: string
      filterSearch: string; filterSortLabel: string
      sortEmail: string; sortCreated: string; sortNewest: string; sortSub: string; sortProjects: string; sortOwned: string
      subDaysLeft: string; subExpired: string
      banButton: string; unbanButton: string; bannedBadge: string
      banConfirmTitle: string; banConfirmDesc: string
      unbanConfirmTitle: string; unbanConfirmDesc: string
      banSuccess: string; unbanSuccess: string
      deleteButton: string; deleteConfirmTitle: string; deleteConfirmDesc: string
      deleteSuccess: string; deleteError: string
      grantSubLabel: string; grantSubTitle: string; grantSubMonths: string
      grantSubButton: string; revokeSubButton: string
      revokeSubConfirmTitle: string; revokeSubConfirmDesc: string
      grantSubSuccess: string; grantSubError: string; revokeSubSuccess: string
    }
    roles: {
      title: string; builtIn: string; custom: string
      newRoleTitle: string; roleNameLabel: string; roleNamePlaceholder: string
      createButton: string; creating: string; createSuccess: string; createError: string
      deleteButton: string; deleting: string; deleteSuccess: string; deleteError: string
      confirmDeleteTitle: string; confirmDeleteAffected: string; confirmDeleteNone: string
      reassignLabel: string
      permissionsTitle: string; nodeCol: string; readCol: string; createCol: string
      updateCol: string; deleteCol: string; wildcardRow: string
      savePerms: string; savingPerms: string; permsSaved: string; permsError: string
      noCustomRoles: string; selectToEdit: string
      systemBadge: string; noPermission: string; noPermissionSub: string
      nodeAccessTab: string; settingsAccessTab: string; galleryAccessTab: string
      galleryImages: string; galleryVideos: string
      galleryView: string; galleryUpload: string; galleryDelete: string
      gallerySave: string; gallerySaving: string; gallerySaved: string
      schemaAccessTab?: string; schemaBoardRow?: string; schemaSaved?: string; schemaViewNote?: string
      schema_canCreate?: string; schema_canUpdate?: string; schema_canDelete?: string; schema_canConnect?: string
      sectionPermissionsTitle: string
      sectionColView?: string; sectionColActions?: string
      saveSectionPerms: string; savingSectionPerms: string
      sectionPermsSaved: string; sectionPermsError: string
      cancel: string; userCount: string
      projectScopeWarning: string; projectOverrideBadge: string; globalDefaultBadge: string
      builtInRoleLabels: Record<string, string>
      docsLinkLabel: string; docsLinkDesc: string
    }
    account: {
      title: string; subtitle: string; emailSection: string; currentEmail: string
      newEmail: string; newEmailPlaceholder: string
      sendCode: string; sending: string; codeSentTo: string
      codeLabel: string; codePlaceholder: string
      confirmChange: string; confirming: string; resend: string; emailUpdated: string
      errors: {
        emailInvalid: string; emailTaken: string; sameEmail: string
        invalidCode: string; unknown: string
      }
      password: {
        title: string; currentLabel: string; newLabel: string
        change: string; changing: string; changed: string
        generate: string; copy: string; copied: string
        errorWeak: string; errorWrong: string; errorUnknown: string
      }
    }
    webMigration: {
      title: string
      // Accordion section headers
      dealerSection: string; dealerDescription: string
      configSection: string; statusConfigured: string; statusNotConfigured: string
      projectScopeNote: string
      apiUrl: string; apiKey: string
      apiKeySet: string; apiKeyNotSet: string; apiKeyReplaceLabel: string; apiKeyReplacePlaceholder: string
      testConnection: string; save: string; saving: string
      show: string; hide: string
      serverAvailable: string; serverBusy: string; serverNotConfigured: string
      connectionOk: string; connectionFail: string
      urlLabel: string; urlPlaceholder: string; maxPages: string; downloadImages: string
      startMigration: string; starting: string; accuracyWarning: string
      progressTitle: string; phaseLabel: string; phaseFallback: string; phaseQueued: string; pagesProgress: string; stepsProgress: string; estimatedTime: string; cancel: string
      cancelDialog: { title: string; message: string; confirm: string; dismiss: string }
      closeDialog: { title: string; message: string; cancelAndClose: string; stay: string }
      resultTitle: string; coverage: string; ttlWarning: string
      summaryPages: string; summarySections: string; summaryElements: string; summaryImages: string
      importTitle: string; strategyBusinessOnly: string; strategyWithPages: string
      importButton: string; importingTitle: string; importing: string
      importedTitle: string; mazoCreated: string; recordsImported: string; sectionsImported: string; imagesImported: string
      newMigration: string; viewOnBoard: string
      errorJobFailed: string; errorRetryAfter: string; errorImport: string
      errorNotConfigured: string; errorServerBusy: string; errorInvalidResult: string
      errorTimeout: string
      errorUnknown: string
      errorCodes: Record<string, string>
      funMessages: string[]
      docsLinkLabel: string; docsLinkDesc: string
      importMessages: string[]
    }
    info: {
      title: string; thankYou: string; version: string; versionLabel: string; releasedOn: string; releaseDate: string
      builtWith: string; stack: string
      openSource: string; openSourceUrl: string; developedBy: string
      license: string; licenseValue: string
      docs: string; docsUrl: string
      sponsorsTitle: string; sponsors: Array<{ name: string; url: string }>
      sponsorsCta: string; sponsorsXUrl: string; sponsorsXLabel: string
    }
    db: {
      title: string; docsLinkLabel: string; docsLinkDesc: string
      exportTitle: string; exportDesc: string; exportButton: string; exporting: string
      importTitle: string; importDesc: string; importButton: string; importing: string
      importOverwriteWarn: string; importSuccess: string; importError: string
      exportWithMediaButton: string; exportWithMediaing: string; exportWithMediaNote: string
      exportError: string; resetError: string
      purgeImagesTitle: string; purgeImagesDesc: string; purgeImagesButton: string
      purgeImagesDialog: {
        title: string; desc: string; storageNote: string; placeholder: string
        confirmPhrase: string; cancel: string; confirm: string; confirming: string
        purgedSummary: string; purgeFailWarn: string
      }
      resetProjectTitle: string; resetProjectDesc: string; resetProjectButton: string
      resetProjectDialog: {
        title: string; desc: string; storageNote: string; placeholder: string
        confirmPhrase: string; cancel: string; confirm: string; confirming: string
        purgedSummary: string; purgeFailWarn: string
      }
    }
    superDb: {
      title: string; subtitle: string
      docsLinkLabel: string; docsLinkDesc: string
      exportTitle: string; exportDesc: string; exportButton: string; exporting: string
      exportWithMediaButton: string; exportWithMediaing: string; exportWithMediaNote: string
      exportError: string
      importTitle: string; importDesc: string; importButton: string; importing: string
      importOverwriteWarn: string; importSuccess: string; importError: string
      resetError: string
      dangerTitle: string; dangerDesc: string; dangerButton: string
      resetDialog: {
        title: string; desc: string; storageNote: string; placeholder: string
        confirmPhrase: string; cancel: string; confirm: string; confirming: string
        purgedSummary: string; purgeFailWarn: string
      }
    }
    subscription: {
      title: string
      description: string
      comingSoon: string
    }
    variables: {
      title: string; subtitle: string
      saveButton: string; saving: string; saved: string
      clearButton: string; clearDesc: string
      overrideBadge: string; envBadge: string; readOnlyNote: string; show: string; hide: string
      groupStorage?: string; groupR2: string; groupBlob: string; groupEmail?: string; groupResend: string; groupSes?: string; groupScraper: string; groupAuth: string; groupMisc: string
      varConfigured?: string; varNotConfigured?: string
      r2Endpoint: string; r2AccessKeyId: string; r2SecretKey: string; r2BucketName: string; r2PublicUrl: string
      blobToken: string; resendApiKey: string; resendFromEmail: string
      sesAccessKeyId?: string; sesSecretAccessKey?: string
      scraperApiUrl: string; scraperApiKey: string; cartumNewPlayer: string; cartumNewPlayerHint: string; cartumNewPlayerLinkLabel: string
      authUrl: string; dbProvider: string; databaseUrl: string
      resetAllButton: string; resetAllConfirmTitle: string; resetAllConfirmDesc: string; resetAllSuccess: string
    }
    cartumProjects: {
      title: string; subtitle: string; ownerLabel: string; roleSuperAdmin: string
      createdLabel: string; memberSingular: string; memberPlural: string
      subActive: string; subExpired: string
      images: string; videos: string; noMedia: string
      filterSearch: string; filterSortLabel: string
      sortName: string; sortMembers: string; sortFiles: string; sortSize: string; sortCreated: string
      noResults: string; noProjects: string; cannotDeleteSuperAdmin: string
      deleteButton: string; deleting: string; deleteSuccess: string; deleteError: string
      docsLinkLabel: string; docsLinkDesc: string
      confirmDialog: {
        title: string; desc: string; superAdminNote: string; placeholder: string
        confirmPhrase: string; cancel: string; confirm: string; confirming: string
      }
    }
  }
  email: {
    poweredBy: string
    reset: {
      subject: string; heading: string; intro: string
      cta: string; urlFallback: string; ignore: string
    }
    welcome: {
      subjectWith: string; subjectFallback: string
      titleWith: string; titleFallback: string
      subtitle: string; saveNotice: string; partOf: string
      labelEmail: string; labelPassword: string
      warning: string; cta: string; note: string
    }
    verifyEmail: {
      subject: string; heading: string; intro: string
      expiry: string; ignore: string
    }
  }
}

export type CmsDictionary = Dictionary['cms']

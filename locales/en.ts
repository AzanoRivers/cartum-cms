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
      title:       'Set up your Project',
      subtitle:    'Give your CMS a name. You can update this later.',
      name:        'Project Name',
      description: 'Description (optional)',
      continue:    'Continue',
    },
    theme: {
      title:    'Choose a theme',
      subtitle: 'Pick a visual style for your dashboard. You can change this anytime in Settings.',
      continue: 'Continue',
      themes: {
        dark:       { label: 'Dark',       description: 'Deep cyberpunk. Max contrast.' },
        cyberSoft:  { label: 'Cyber Soft', description: 'Deep blue-grey. Pro mode.' },
        light:      { label: 'Light',      description: 'Slate white. Bright environments.' },
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
      forgotPassword: 'Forgot password?',
      captchaLabel:   'Verify the sum',
      captchaPlaceholder: '?',
      captchaError:   'Incorrect answer. Try again.',
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
    },
    resetPassword: {
      title:           'Set new password',
      subtitle:        'Choose a strong password of at least 12 characters.',
      newPassword:     'New password',
      confirmPassword: 'Confirm password',
      submit:          'Set new password',
      submitting:      'Saving...',
    },
  },
  cms: {
    topBar: {
      account:           'Account',
      logOut:            'Log out',
      userMenuAriaLabel: 'User menu',
    },
    dock: {
      settings:      'Settings',
      home:          'Home',
      content:       'Content',
      create:        'Create node',
      backToBuilder: 'Back to Builder',
      help:          'Help & Shortcuts',
    },
    help: {
      title:           'Help',
      shortcutsTitle:  'Keyboard Shortcuts',
      close:           'Close',
      categoryNav:     'Navigation',
      categoryPanels:  'Panels',
      shortcuts: {
        goHome:       { keys: 'G → H', description: 'Go to Board' },
        goContent:    { keys: 'G → C', description: 'Go to Content' },
        newNode:      { keys: 'G → N', description: 'Create new node' },
        openSettings: { keys: 'G → ,', description: 'Open Settings' },
        closeOverlay: { keys: 'Esc',   description: 'Close any open panel' },
      },
    },
    canvas: {
      ariaLabel: 'Node canvas',
      empty:     'No nodes yet.',
      emptyHint: 'Use + to create your first container.',
    },
    nodeCard: {
      fields:      'fields',
      records:     'records',
      connections: 'connections',
      required:    '*',
      types: {
        text:     'text',
        number:   'number',
        boolean:  'boolean',
        image:    'image',
        video:    'video',
        relation: 'relation',
      },
    },
    creation: {
      ariaLabel:      'Create node',
      titleTypeSelect: 'Create node',
      titleFieldType:  'Select field type',
      titleName:       'Name your node',
      containerLabel:  'Container',
      containerDesc:   'Database table / model',
      fieldLabel:      'Field',
      fieldDesc:       'Column / attribute',
      nodeName:        'Node name',
      placeholder:     'e.g. blog_posts',
      back:            'Back',
      create:          'Create',
      errors: {
        nameRequired: 'Name is required.',
        nameTaken:    'A node with this name already exists here.',
      },
    },
    fieldTypePicker: {
      text:     'Text',
      number:   'Number',
      boolean:  'Boolean',
      image:    'Image',
      video:    'Video',
      relation: 'Relation',
    },
    fieldEdit: {
      ariaLabel:        'Edit field',
      title:            'Edit field',
      name:             'Name',
      requiredToggle:   'Required field',
      fieldType:        'Field type',
      cancel:           'Cancel',
      save:             'Save',
      saving:           'Saving…',
      typeChangeBlocked: 'This field has existing records. Delete all records first to change the type.',
      text: {
        multiline:           'Multiline (textarea)',
        maxLength:           'Max length (optional)',
        maxLengthPlaceholder: 'e.g. 255',
      },
      number: {
        subtype:         'Subtype',
        subtypeInt:      'integer',
        subtypeFloat:    'float',
        min:             'Min',
        max:             'Max',
        minPlaceholder:  '—',
        maxPlaceholder:  '—',
        rangeError:      'Min must be less than or equal to Max.',
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
        configuredImages:    'Storage configured. Images will be uploaded and optimized automatically in records.',
        configuredVideos:    'Storage configured. Videos will be uploaded and optimized automatically in records.',
        imageFormats:        'Accepted formats: WebP, JPEG (auto-optimized)',
        videoFormats:        'Accepted formats: MP4, WebM (auto-optimized)',
        goToContent:         'Upload files in a new record',
      },
      relation: {
        targetLabel:       'Target container',
        targetPlaceholder: '— Select a container —',
        relationType:      'Relation type',
      },
      errors: {
        nameRequired:     'Name is required.',
        nameInvalid:      'Name contains invalid characters.',
        nameTaken:        'A node with this name already exists here.',
        relTargetRequired: 'Please select a relation target.',
        unknown:          'Unknown error.',
      },
    },
    mobileList: {
      empty:           'No nodes yet.',
      emptyHint:       'Use + to create your first container.',
      fieldsSeparator: 'Fields',
    },
    content: {
      title:         'Content',
      backToContent: 'Back to Content',
      index: {
        emptyOwn: 'No content areas have been assigned to your account.',
        records:  'records',
        browse:   'Browse records',
      },
      list: {
        newRecord:       'New record',
        search:          'Search…',
        noResults:       'No records found.',
        empty:           'No records yet.',
        createdAt:       'Created',
        editAriaLabel:   'Edit',
        deleteAriaLabel: 'Delete',
        confirmDelete:   'Delete this record?',
        confirmYes:      'Delete',
        confirmNo:       'Cancel',
      },
      form: {
        newTitle: 'New record',
        editTitle: 'Edit record',
        save:     'Save',
        saving:   'Saving…',
        discard:  'Discard',
        errors: {
          required:      'This field is required.',
          invalidNumber: 'Must be a valid number.',
          numberRange:   'Value is out of the allowed range.',
          relRequired:   'Please select a related record.',
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
        placeholder: '— Select a record —',
        noOptions:   'No records found.',
      },
    },
    board: {
      canvasMenu: {
        back:    'Go back',
        forward: 'Go forward',
        fitAll:  'Center nodes',
      },
      contextMenu: {
        rename:     'Rename',
        duplicate: 'Duplicate',
        deleteNode: 'Delete node',
      },
      deleteDialog: {
        title:                  'Delete "{name}"?',
        warnMessage:            'This will remove related data and cannot be undone.',
        dangerMessage:          'This has dangerous consequences and cannot be undone.',
        cancel:                 'Cancel',
        confirm:                'Confirm delete',
        confirmDanger:          'Yes, delete anyway',
        deleting:               'Deleting…',
        factorChildren:         '{count} field(s) inside this node',
        factorConnections:      '{count} connection(s) to other nodes',
        factorRecordsContainer: '{count} record(s) stored in this node',
        factorRecordsField:     '{count} record(s) in parent node will lose this field',
        factorRelations:        '{count} relation field(s) pointing here',
      },
      toast: {
        duplicateSuccess: 'Node duplicated successfully.',
        duplicateError:   'Could not duplicate node.',
        deleteSuccess:    'Node deleted.',
        deleteError:      'Could not delete node.',
        checkRiskError:   'Could not check node dependencies. Please try again.',
        renameSuccess:    'Node renamed.',
        renameError:      'Could not rename node.',
      },
      renameDialog: {
        title:       'Rename node',
        label:       'Node name',
        placeholder: 'my_node_name',
        cancel:      'Cancel',
        save:        'Save',
        saving:      'Saving…',
      },
    },
    notFound: {
      title:    'Page not found',
      message:  "The node or page you're looking for doesn't exist, was deleted, or the URL is invalid.",
      back:     'Back to board',
    },
  },
  settings: {
    nav: {
      account:    'Account',
      appearance: 'Appearance',
      project:    'Project',
      storage:    'Storage',
      email:      'Sending',
      api:        'API Tokens',
      users:      'Users',
      roles:      'Roles',
      info:       'Info',
      db:         'Database',
    },
    panelTitle: 'SETTINGS',
    appearance: {
      title:      'Appearance',
      themeLabel: 'Color theme',
      saved:      'Theme saved.',
      saveError:  'Could not save theme.',
      themes: {
        dark:      { label: 'Dark',       description: 'Deep cyberpunk. Max contrast.' },
        cyberSoft: { label: 'Cyber Soft', description: 'Deep blue-grey. Pro mode.' },
        light:     { label: 'Light',      description: 'Slate white. Bright environments.' },
      },
    },
    project: {
      title:         'Project',
      projectName:   'Project name',
      description:   'Description',
      descriptionPlaceholder: 'Short description of this project (optional)',
      defaultLocale: 'Default locale',
      localeEn:      'English',
      localeEs:      'Spanish',
      save:          'Save changes',
      saving:        'Saving...',
      saved:         'Project settings saved.',
      error:         'Could not save project settings.',
    },
    storage: {
      title:                   'Storage',
      r2BucketName:            'R2 Bucket name',
      r2BucketNamePlaceholder: 'my-bucket',
      r2PublicUrl:             'R2 Public URL',
      r2PublicUrlPlaceholder:  'https://pub-xxx.r2.dev',
      mediaVpsUrl:             'Optimization server URL',
      mediaVpsUrlPlaceholder:  'https://optimus.azanolabs.com',
      mediaVpsKey:             'Optimization server API key',
      showKey:                 'Show',
      hideKey:                 'Hide',
      apiDocsLink:             'API Docs ↗',
      testConnection:          'Test connection',
      testing:                 'Testing...',
      testOk:                  'Connected · {latencyMs}ms',
      testFail:                'Connection failed.',
      save:                    'Save changes',
      saving:                  'Saving...',
      saved:                   'Storage settings saved.',
      error:                   'Could not save storage settings.',
      saveEmptyNotice:         'Saving empty values removes them from the database (env fallback resumes).',
    },
    email: {
      title:               'Email',
      notConfigured:       'Email delivery is not configured. Add a Resend API key to enable password recovery and user invites.',
      resendApiKey:        'Resend API key',
      resendKeyPlaceholder: 're_••••••••••••',
      testEmail:           'Send test email',
      testing:             'Sending...',
      testOk:              'Test email sent.',
      testFail:            'Could not send test email.',
      save:                'Save changes',
      saving:              'Saving...',
      saved:               'Email settings saved.',
      error:               'Could not save email settings.',
    },
    api: {
      title:           'API Tokens',
      tokenName:       'Name',
      roleCol:         'Role',
      lastUsed:        'Last used',
      expiresCol:      'Expires',
      never:           'Never',
      revoke:          'Revoke',
      revoking:        'Revoking...',
      revokeSuccess:   'Token revoked.',
      newTokenTitle:   'New token',
      namePlaceholder: 'e.g. Frontend App',
      expiresLabel:    'Expiry date (optional)',
      roleLabel:       'Role',
      createButton:    'Create token',
      creating:        'Creating...',
      createSuccess:   'Token created.',
      createError:     'Could not create token.',
      copyToken:       'Copy token',
      copied:          'Copied!',
      tokenOnceNotice: 'Copy this token now — it will not be shown again.',
      confirmCopied:   'I have copied this token',
      close:           'Close',
      empty:           'No active tokens.',
    },
    users: {
      title:              'Users',
      inviteTitle:        'Invite user',
      emailLabel:         'Email address',
      emailPlaceholder:   'user@example.com',
      roleLabel:          'Role',
      inviteButton:       'Send invite',
      inviting:           'Inviting...',
      inviteSuccess:      'User invited.',
      inviteError:        'Could not invite user.',
      roleChanged:        'Role updated.',
      removeButton:       'Remove',
      removing:           'Removing...',
      removeSuccess:      'User removed.',
      removeConfirmTitle: 'Remove this user?',
      removeConfirmDesc:  'This action cannot be undone.',
      noEmailNotice:      'Email is not configured. Share this temporary password with the user:',
      copyPassword:       'Copy password',
      close:              'Close',
      empty:              'No other users yet.',
      youLabel:           '(you)',
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
      confirmDeleteAffected: '{count} user(s) will be reassigned to viewer.',
      confirmDeleteNone:     'No users assigned to this role.',
      permissionsTitle:      'Permissions — {name}',
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
    },
    account: {
      title:               'Account',
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
    info: {
      title:          'Info',
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
    },
    db: {
      title:              'Database',
      exportTitle:        'Export',
      exportDesc:         'Download a JSON backup of all CMS content (nodes, fields, records, media).',
      exportButton:       'Export backup',
      exporting:          'Exporting...',
      importTitle:        'Import',
      importDesc:         'Restore content from a previously exported backup file.',
      importButton:       'Choose backup file',
      importing:          'Importing...',
      importOverwriteWarn:'This will overwrite all existing nodes, fields and records.',
      importSuccess:      'Backup imported successfully.',
      importError:        'Import failed. Make sure the file is a valid Cartum backup.',
      exportError:        'Export failed. Please try again.',
      resetError:         'Reset failed. Please try again.',
      dangerTitle:        'Danger zone',
      dangerDesc:         'Permanently delete all CMS data, users and settings. This cannot be undone.',
      dangerButton:       'Delete all data',
      resetDialog: {
        title:         'Delete all data?',
        desc:          'This will permanently erase all users, nodes, records, media and settings. The CMS will restart from zero.',
        placeholder:   'Type to confirm',
        confirmPhrase: 'DELETE PERMANENTLY',
        cancel:        'Cancel',
        confirm:       'Yes, delete everything',
        confirming:    'Deleting...',
      },
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
      subjectWith:     'Welcome to {project} — save your credentials',
      subjectFallback: 'Welcome to Cartum — save your credentials',
      titleWith:       'Welcome to {project}',
      titleFallback:   'Welcome to Cartum',
      subtitle:        'Your admin account has been created. Below are your access credentials.',
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
      description: string; continue: string
    }
    theme: {
      title: string; subtitle: string; continue: string
      themes: {
        dark:      { label: string; description: string }
        cyberSoft: { label: string; description: string }
        light:     { label: string; description: string }
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
      error: string; forgotPassword: string
      captchaLabel: string; captchaPlaceholder: string; captchaError: string
    }
    forgotPassword: {
      title: string; subtitle: string; email: string
      submit: string; submitting: string; success: string
      backToLogin: string; noEmailWarning: string
    }
    resetPassword: {
      title: string; subtitle: string; newPassword: string
      confirmPassword: string; submit: string; submitting: string
    }
  }
  cms: {
    topBar: { account: string; logOut: string; userMenuAriaLabel: string }
    dock:   { settings: string; home: string; content: string; create: string; backToBuilder: string; help: string }
    help: {
      title: string; shortcutsTitle: string; close: string
      categoryNav: string; categoryPanels: string
      shortcuts: {
        goHome:       { keys: string; description: string }
        goContent:    { keys: string; description: string }
        newNode:      { keys: string; description: string }
        openSettings: { keys: string; description: string }
        closeOverlay: { keys: string; description: string }
      }
    }
    canvas: { ariaLabel: string; empty: string; emptyHint: string }
    nodeCard: {
      fields: string; records: string; connections: string; required: string
      types: { text: string; number: string; boolean: string; image: string; video: string; relation: string }
    }
    creation: {
      ariaLabel: string; titleTypeSelect: string; titleFieldType: string; titleName: string
      containerLabel: string; containerDesc: string; fieldLabel: string; fieldDesc: string
      nodeName: string; placeholder: string; back: string; create: string
      errors: { nameRequired: string; nameTaken: string }
    }
    fieldTypePicker: { text: string; number: string; boolean: string; image: string; video: string; relation: string }
    fieldEdit: {
      ariaLabel: string; title: string; name: string; requiredToggle: string
      fieldType: string; cancel: string; save: string; saving: string; typeChangeBlocked: string
      text:    { multiline: string; maxLength: string; maxLengthPlaceholder: string }
      number:  { subtype: string; subtypeInt: string; subtypeFloat: string; min: string; max: string; minPlaceholder: string; maxPlaceholder: string; rangeError: string }
      boolean: { defaultValue: string; trueLabel: string; falseLabel: string; truePlaceholder: string; falsePlaceholder: string }
      storage: { notConfiguredImages: string; notConfiguredVideos: string; configuredImages: string; configuredVideos: string; imageFormats: string; videoFormats: string; goToContent: string }
      relation:{ targetLabel: string; targetPlaceholder: string; relationType: string }
      errors:  { nameRequired: string; nameInvalid: string; nameTaken: string; relTargetRequired: string; unknown: string }
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
    }
    board: {
      canvasMenu: { back: string; forward: string; fitAll: string }
      contextMenu: { rename: string; duplicate: string; deleteNode: string }
      deleteDialog: {
        title: string; warnMessage: string; dangerMessage: string
        cancel: string; confirm: string; confirmDanger: string; deleting: string
        factorChildren: string; factorConnections: string
        factorRecordsContainer: string; factorRecordsField: string; factorRelations: string
      }
      toast: {
        duplicateSuccess: string; duplicateError: string
        deleteSuccess: string; deleteError: string; checkRiskError: string
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
    nav: {
      account: string; appearance: string; project: string; storage: string; email: string
      api: string; users: string; roles: string; info: string; db: string
    }
    appearance: {
      title: string; themeLabel: string; saved: string; saveError: string
      themes: {
        dark:      { label: string; description: string }
        cyberSoft: { label: string; description: string }
        light:     { label: string; description: string }
      }
    }
    project: {
      title: string; projectName: string; description: string; descriptionPlaceholder: string; defaultLocale: string
      localeEn: string; localeEs: string
      save: string; saving: string; saved: string; error: string
    }
    storage: {
      title: string
      r2BucketName: string; r2BucketNamePlaceholder: string
      r2PublicUrl: string; r2PublicUrlPlaceholder: string
      mediaVpsUrl: string; mediaVpsUrlPlaceholder: string; mediaVpsKey: string
      showKey: string; hideKey: string; apiDocsLink: string
      testConnection: string; testing: string; testOk: string; testFail: string
      save: string; saving: string; saved: string; error: string; saveEmptyNotice: string
    }
    email: {
      title: string; notConfigured: string
      resendApiKey: string; resendKeyPlaceholder: string
      testEmail: string; testing: string; testOk: string; testFail: string
      save: string; saving: string; saved: string; error: string
    }
    api: {
      title: string; tokenName: string; roleCol: string; lastUsed: string; expiresCol: string
      never: string; revoke: string; revoking: string; revokeSuccess: string
      newTokenTitle: string; namePlaceholder: string; expiresLabel: string; roleLabel: string
      createButton: string; creating: string; createSuccess: string; createError: string
      copyToken: string; copied: string; tokenOnceNotice: string; confirmCopied: string
      close: string; empty: string
    }
    users: {
      title: string; inviteTitle: string; emailLabel: string; emailPlaceholder: string
      roleLabel: string; inviteButton: string; inviting: string
      inviteSuccess: string; inviteError: string; roleChanged: string
      removeButton: string; removing: string; removeSuccess: string
      removeConfirmTitle: string; removeConfirmDesc: string
      noEmailNotice: string; copyPassword: string; close: string
      empty: string; youLabel: string
    }
    roles: {
      title: string; builtIn: string; custom: string
      newRoleTitle: string; roleNameLabel: string; roleNamePlaceholder: string
      createButton: string; creating: string; createSuccess: string; createError: string
      deleteButton: string; deleting: string; deleteSuccess: string; deleteError: string
      confirmDeleteTitle: string; confirmDeleteAffected: string; confirmDeleteNone: string
      permissionsTitle: string; nodeCol: string; readCol: string; createCol: string
      updateCol: string; deleteCol: string; wildcardRow: string
      savePerms: string; savingPerms: string; permsSaved: string; permsError: string
      noCustomRoles: string; selectToEdit: string
    }
    account: {
      title: string; emailSection: string; currentEmail: string
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
    info: {
      title: string; version: string; versionLabel: string; releasedOn: string; releaseDate: string
      builtWith: string; stack: string
      openSource: string; openSourceUrl: string; developedBy: string
      license: string; licenseValue: string
      docs: string; docsUrl: string
    }
    db: {
      title: string; exportTitle: string; exportDesc: string; exportButton: string; exporting: string
      importTitle: string; importDesc: string; importButton: string; importing: string
      importOverwriteWarn: string; importSuccess: string; importError: string
      exportError: string; resetError: string
      dangerTitle: string; dangerDesc: string; dangerButton: string
      resetDialog: {
        title: string; desc: string; placeholder: string
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
      subtitle: string; saveNotice: string
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

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
      loginSuccess:   'Welcome back!',
      accountDisabled: 'Your account is disabled. Contact your administrator.',
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
      title:              'Help',
      shortcutsTitle:     'Keyboard Shortcuts',
      gesturesTitle:      'Touch Gestures',
      close:              'Close',
      categoryNav:        'Navigation',
      categoryPanels:     'Panels',
      categoryGestures:   'Board',
      shortcuts: {
        goHome:       { keys: 'G → H', description: 'Go to Board' },
        goContent:    { keys: 'G → C', description: 'Go to Content' },
        newNode:      { keys: 'G → N', description: 'Create new node' },
        openSettings: { keys: 'G → ,', description: 'Open Settings' },
        closeOverlay: { keys: 'Esc',   description: 'Close any open panel' },
      },
      gestures: {
        singleTap:   { icon: '1×', description: 'Tap once: select the node and reveal its connection ports' },
        doubleTap:   { icon: '2×', description: 'Tap twice: enter the node (open container or edit field)' },
        longPress:   { icon: '⏱',  description: 'Hold and move: drag the node to reposition it' },
        portDrag:    { icon: '⊙',  description: 'Tap a port dot, then drag to draw a connection' },
        pinch:       { icon: '⟺',  description: 'Two-finger pinch: zoom in or out' },
        panCanvas:   { icon: '↕',  description: 'Drag on empty space: pan the canvas' },
      },
      docsButton: 'Documentation',
    },
    docs: {
      breadcrumb: 'Docs',
      sidebarAriaLabel: 'Documentation navigation',
      sections: {
        gettingStarted: 'Getting Started',
        navigation:     'Navigation',
        nodesAndFields: 'Nodes & Fields',
        content:        'Content',
        media:          'Media & Storage',
        apiForDevs:     'API for Developers',
        apiSchema:      'API: Schema Discovery',
      },
      gettingStarted: {
        title:         'Getting Started',
        intro:         'Cartum is a serverless-first headless CMS with visual data modeling.',
        conceptsTitle: 'Core concepts',
        concepts: {
          node:       'Node: a database table / model',
          field:      'Field: a column (text, number, boolean, image, video, gallery, relation)',
          record:     'Record: a row of data',
          connection: 'Connection: a relationship between nodes (foreign key)',
        },
        flowTitle: 'Basic workflow',
        flow:      'Create node → add fields → go to Content → create records',
      },
      navigation: {
        title:          'Navigation',
        dockTitle:      'DockBar',
        dockDesc:       'The icon sidebar on the left: Home (board), Content, Create node, Settings, Help.',
        boardLabel:     'Board',
        boardDesc:      'Infinite visual canvas of nodes and connections.',
        contentLabel:   'Content',
        contentDesc:    'Record list per node.',
        shortcutsTitle: 'Keyboard shortcuts (desktop)',
        shortcuts: {
          goHome:       'Go to Board',
          goContent:    'Go to Content',
          newNode:      'Create new node',
          openSettings: 'Open Settings',
          closeOverlay: 'Close any open panel',
        },
        gesturesTitle: 'Touch gestures (mobile)',
        gestures: {
          singleTap: 'Tap once: select node and show ports',
          doubleTap: 'Tap twice: enter the node',
          longPress:  'Hold and drag: move node',
          pinch:      'Two-finger pinch: zoom',
          pan:        'Drag on empty space: pan',
        },
      },
      nodesAndFields: {
        title:                'Nodes & Fields',
        createContainerTitle: 'Creating a container node',
        createContainerDesc:  'Click + in the dock → choose Container → enter a name.',
        createFieldTitle:     'Creating a field',
        createFieldDesc:      'Double-click a container → click + inside → choose type → enter name.',
        fieldTypesTitle:      'Field types',
        fieldTypes: {
          text:     'text: string, with optional multiline and max length',
          number:   'number: integer or decimal, optional range',
          boolean:  'boolean: true/false with custom labels',
          image:    'image: uploads to R2, auto-optimized via Optimus VPS',
          video:    'video: chunked upload, compressed via Optimus VPS',
          gallery:  'gallery: multiple images (configurable max)',
          relation: 'relation: foreign key to another container node',
        },
        connectionsTitle: 'Connections',
        connectionsDesc:  'Drag from the port of a relation field to another container to draw a relationship.',
      },
      content: {
        title:          'Content Editing',
        step1:          'Go to Content from the dock.',
        step2:          'Select the node to edit.',
        newRecord:      'New Record: create a record with all container fields.',
        editRecord:     'Edit Record: modify existing values.',
        deleteRecord:   'Delete Record: remove with confirmation.',
        validationNote: 'Validation: required fields and number ranges are enforced.',
        mediaNote:      'Image/video fields: upload a file or select from the Media Library.',
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
      },
      apiForDevs: {
        title:        'API for Developers',
        intro:        'The public API exposes record data and the node schema. Board canvas positions are internal-only.',
        tokenTitle:   'Create an API Token',
        tokenStep1:   'Go to Settings → API Tokens.',
        tokenStep2:   'Enter a descriptive name (e.g. Frontend App).',
        tokenStep3:   'Select a Role (defines per-node permissions).',
        tokenStep4:   'Optionally set an expiration date.',
        tokenStep5:   'Copy the token. It is shown only once.',
        authTitle:    'Authentication',
        authNote:     'All endpoints require this header. Without it: 401 UNAUTHORIZED.',
        baseUrlTitle: 'Base URL',
        nodeNameTitle:'What is {nodeName}?',
        nodeNameDesc: 'The slug of a container node you created in the board. There are no predefined models. You define the structure.',
        endpointsTitle: 'Available endpoints',
        endpoints: {
          schema:      'List all nodes and their fields',
          getNode:     'Get node metadata by UUID',
          getField:    'Get field metadata by UUID',
          listRecords: 'List records (paginated)',
          getRecord:   'Get a single record by UUID',
          createRecord:'Create a new record',
          putRecord:   'Replace all fields of a record',
          patchRecord: 'Partially update a record (merge)',
          deleteRecord:'Delete a record',
        },
        endpointPermissions: {
          anyToken: 'any valid token',
          read:     'read',
          create:   'create',
          update:   'update',
          delete:   'delete',
        },
        putVsPatchNote:   'PUT replaces the entire data object. PATCH merges with existing data. Omitted fields are preserved.',
        canvasNote:       'Node positions in the board canvas are not exposed. They are internal CMS configuration.',
        queryParamsTitle: 'Query parameters (GET list)',
        params: {
          page:    { name: 'page',    type: 'number',   default: '1',            desc: 'Current page' },
          limit:   { name: 'limit',   type: 'number',   default: '20 (max 100)', desc: 'Items per page' },
          sort:    { name: 'sort',    type: 'string',   default: 'created_at',   desc: 'Field to sort by' },
          order:   { name: 'order',   type: 'asc|desc', default: 'desc',         desc: 'Sort direction' },
          include: { name: 'include', type: 'string',   default: 'none',          desc: 'Relation fields to expand (e.g. author,category). UUID replaced by full record.' },
        },
        responseListTitle:   'Successful response: list',
        responseRecordTitle: 'Successful response: single record',
        includeTitle:        'Relation expansion (include)',
        includeDesc:         'Relation fields store the related record UUID. With ?include=field the UUID is replaced by the full record (one level deep).',
        errorsTitle:         'Error codes',
        errors: {
          badRequest:   { code: '400', name: 'BAD_REQUEST',      desc: 'Invalid JSON in request body' },
          unauthorized: { code: '401', name: 'UNAUTHORIZED',     desc: 'Missing, invalid, revoked, or expired token' },
          forbidden:    { code: '403', name: 'FORBIDDEN',        desc: 'Token role lacks permission for this node/action' },
          notFound:     { code: '404', name: 'NOT_FOUND',        desc: 'Node slug or record UUID not found' },
          validation:   { code: '422', name: 'VALIDATION_ERROR', desc: 'Invalid data (required field, out of range, etc.)' },
          noContent:    { code: '204', name: 'n/a',               desc: 'DELETE successful (no response body)' },
        },
        examplesTitle: 'cURL examples',
        examplesNote:  'Assumes a node called `products` with fields name (text), price (number), featured (boolean).',
      },
      apiSchema: {
        title:            'API: Schema Discovery',
        intro:            'Before consuming data, discover which nodes exist and what fields they have, without opening the CMS.',
        endpointLabel:    'Endpoint',
        anyTokenNote:     'Any valid token can access this. No per-node permission required.',
        responseTitle:    'Response',
        fieldsTableTitle: 'Fields in each field object',
        fields: {
          id:           { name: 'id',           type: 'string',  desc: 'Field UUID' },
          name:         { name: 'name',        type: 'string',  desc: 'Field name' },
          type:         { name: 'type',         type: 'string',  desc: 'Type: text, number, boolean, image, video, gallery, relation' },
          required:     { name: 'required',     type: 'boolean', desc: 'Whether the field is required when creating/updating' },
          defaultValue: { name: 'defaultValue', type: 'string',  desc: '(optional) Configured default value' },
          relatesTo:    { name: 'relatesTo',    type: 'string',  desc: '(relation fields only) Slug of the related node' },
        },
        exampleLabel: 'cURL example',
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
        gallery:  'gallery',
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
      gallery:  'Gallery',
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
        multiline:               'Multiline (textarea)',
        maxLength:               'Max length (optional)',
        maxLengthPlaceholder:    'e.g. 255',
        defaultValueLabel:       'Default value (optional)',
        defaultValuePlaceholder: 'Enter default text…',
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
        configuredImages:    'Storage configured. Images will be uploaded and optimized automatically in records.',
        configuredVideos:    'Storage configured. Videos will be uploaded and optimized automatically in records.',
        imageFormats:        'Accepted formats: WebP, JPEG (auto-optimized)',
        videoFormats:        'Accepted formats: MP4, WebM (auto-optimized)',
        goToContent:         'Upload files in a new record',
      },
      relation: {
        targetLabel:       'Target container',
        targetPlaceholder: 'Select a container',
        relationType:      'Relation type',
      },
      errors: {
        nameRequired:     'Name is required.',
        nameInvalid:      'Name contains invalid characters.',
        nameTaken:        'A node with this name already exists here.',
        relTargetRequired: 'Please select a relation target.',
        unknown:          'Unknown error.',
      },
      accordion: {
        typeSection:    'Field type',
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
        otherTypesMsg: 'This field\'s content is edited in the node\'s records.',
        uploading:     'Uploading…',
        optimizing:    'Optimizing…',
        uploadError:   'Upload failed.',
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
        placeholder: 'Select a record',
        noOptions:   'No records found.',
      },
      mediaGallery: {
        title:           'Media Gallery',
        tabImages:       'Images',
        tabVideos:       'Videos',
        searchPlaceholder: 'Search…',
        uploadBtn:       'Upload',
        emptyImages:     'No images yet.',
        emptyVideos:     'No videos yet.',
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
        // Video VPS upload phases
        videoSizeError:   'Video exceeds the 500 MB limit.',
        videoChunking:    'Uploading to VPS…',
        videoProcessing:  'Compressing…',
        videoFinalizing:  'Saving…',
        videoVpsSkipped:  'Optimizer not configured. Uploading original.',
        // Video fallback warning modal
        videoFallbackTitle:  'Large video warning',
        videoFallbackBody:   'This video exceeds 100 MB, which is above the recommended limit. Large videos may cause slow load times even after compression. Consider using a smaller or pre-optimized file.',
        videoFallbackUpload: 'Upload anyway',
        videoFallbackCancel: 'Cancel',
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
      fromEmailLabel:      'From email address',
      fromEmailHint:       'Must be from a verified domain in your Resend account.',
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
      tokenOnceNotice: 'Copy this token now. It will not be shown again.',
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
      noPermission:          'No permission to edit',
      sectionPermissionsTitle: 'Settings access',
      saveSectionPerms:      'Save changes',
      savingSectionPerms:    'Saving...',
      sectionPermsSaved:     'Permissions saved.',
      sectionPermsError:     'Could not save permissions.',
      cancel:                'Cancel',
      userCount:             '{count} user(s)',
      builtInRoleLabels: {
        admin:      'Admin',
        editor:     'Editor',
        viewer:     'Viewer',
        restricted: 'Restricted',
      },
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
      loginSuccess: string; accountDisabled: string
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
  }
  cms: {
    topBar: { account: string; logOut: string; userMenuAriaLabel: string }
    dock:   { settings: string; home: string; content: string; create: string; backToBuilder: string; help: string }
    help: {
      title: string; shortcutsTitle: string; gesturesTitle: string; close: string
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
      docsButton: string
    }
    docs: {
      breadcrumb: string
      sidebarAriaLabel: string
      sections: {
        gettingStarted: string; navigation: string; nodesAndFields: string
        content: string; media: string; apiForDevs: string; apiSchema: string
      }
      gettingStarted: {
        title: string; intro: string; conceptsTitle: string
        concepts: { node: string; field: string; record: string; connection: string }
        flowTitle: string; flow: string
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
        title: string; createContainerTitle: string; createContainerDesc: string
        createFieldTitle: string; createFieldDesc: string; fieldTypesTitle: string
        fieldTypes: { text: string; number: string; boolean: string; image: string; video: string; gallery: string; relation: string }
        connectionsTitle: string; connectionsDesc: string
      }
      content: {
        title: string; step1: string; step2: string
        newRecord: string; editRecord: string; deleteRecord: string
        validationNote: string; mediaNote: string
      }
      media: {
        title: string; galleryTitle: string; galleryDesc: string
        optimTitle: string; optimImages: string; optimVideos: string; optimFallback: string
        limitsTitle: string; limitImages: string; limitVideos: string; configNote: string
      }
      apiForDevs: {
        title: string; intro: string
        tokenTitle: string; tokenStep1: string; tokenStep2: string; tokenStep3: string; tokenStep4: string; tokenStep5: string
        authTitle: string; authNote: string; baseUrlTitle: string; nodeNameTitle: string; nodeNameDesc: string
        endpointsTitle: string
        endpoints: { schema: string; getNode: string; getField: string; listRecords: string; getRecord: string; createRecord: string; putRecord: string; patchRecord: string; deleteRecord: string }
        endpointPermissions: { anyToken: string; read: string; create: string; update: string; delete: string }
        putVsPatchNote: string; canvasNote: string; queryParamsTitle: string
        params: {
          page:    { name: string; type: string; default: string; desc: string }
          limit:   { name: string; type: string; default: string; desc: string }
          sort:    { name: string; type: string; default: string; desc: string }
          order:   { name: string; type: string; default: string; desc: string }
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
    }
    canvas: { ariaLabel: string; empty: string; emptyHint: string }
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
      text:    { multiline: string; maxLength: string; maxLengthPlaceholder: string; defaultValueLabel: string; defaultValuePlaceholder: string }
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
      }
      gallery: { maxItems: string; maxItemsPlaceholder: string }
      galleryContent: {
        addImage: string; removeImage: string; confirmRemove: string
        selectFromLib: string; uploadNew: string; empty: string; maxReached: string
        uploading: string; optimizing: string; uploadError: string
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
        dropHere: string; orClick: string; uploadStart: string
        optimizing: string; uploading: string; uploadSuccess: string; uploadError: string
        deleteLabel: string; confirmDelete: string; copyUrlLabel: string; copiedLabel: string
        ofLabel: string; perPageLabel: string
        vpsUnreachable: string; vpsAuth: string; vpsTimeout: string
        vpsValidation: string; vpsPartial: string
        bulkPlaceholder: string; bulkDownload: string; bulkDelete: string
        bulkSelected: string; bulkClear: string
        bulkDeleteTitle: string; bulkDeleteBody: string; bulkDeleteConfirm: string
        bulkDeleteCancel: string; bulkDeleting: string
        bulkDeletedSuccess: string; bulkDeletedPartial: string
        bulkDownloading: string; bulkDownloadSuccess: string
        videoSizeError: string; videoChunking: string; videoProcessing: string
        videoFinalizing: string; videoVpsSkipped: string
        videoFallbackTitle: string; videoFallbackBody: string
        videoFallbackUpload: string; videoFallbackCancel: string
      }
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
      fromEmailLabel: string; fromEmailHint: string
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
      systemBadge: string; noPermission: string
      sectionPermissionsTitle: string
      saveSectionPerms: string; savingSectionPerms: string
      sectionPermsSaved: string; sectionPermsError: string
      cancel: string; userCount: string
      builtInRoleLabels: Record<string, string>
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

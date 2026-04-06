export const en = {
  setup: {
    stepLabels: ['System Check', 'Language', 'Admin Account', 'Project', 'Initializing', 'Ready'],
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
      title:       'Create Admin Account',
      subtitle:    'This account will have full control over the CMS.',
      email:       'Email',
      password:    'Password',
      confirm:     'Confirm Password',
      strength:    { weak: 'Weak', fair: 'Fair', strong: 'Strong' },
      continue:    'Continue',
      errors: {
        email:    'Enter a valid email address.',
        password: 'Password must be at least 12 characters.',
        confirm:  'Passwords do not match.',
      },
    },
    project: {
      title:       'Set up your Project',
      subtitle:    'Give your CMS a name. You can update this later.',
      name:        'Project Name',
      description: 'Description (optional)',
      continue:    'Continue',
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
} satisfies Dictionary

export type Dictionary = {
  setup: {
    stepLabels: [string, string, string, string, string, string]
    layout: { back: string }
    systemCheck: {
      title: string; subtitle: string; db: string; env: string
      schema: string; storageLabel: string; storageWarning: string
      allOk: string; continue: string; fixFirst: string
    }
    locale: { title: string; subtitle: string; continue: string }
    credentials: {
      title: string; subtitle: string; email: string
      password: string; confirm: string
      strength: { weak: string; fair: string; strong: string }
      continue: string
      errors: { email: string; password: string; confirm: string }
    }
    project: {
      title: string; subtitle: string; name: string
      description: string; continue: string
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
}

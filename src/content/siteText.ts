export type SiteText = {
  navigation: {
    home: string
    journey: string
    clients: string
    myWork: string
    creativeServices: string
    letsConnect: string
    login: string
  }
  home: {
    meetArtistTitle: string

    latestWorkTitle: string
    latestWorkDescription: string
    latestWorkCardCaption: string

    myWorkTitle: string
    searchPlaceholder: string

    carouselLogoPlaceholder: string
    carouselClientNamePlaceholder: string

    servicesTitle: string
    servicesDescription: string

    contactTitlePrefix: string
    contactTitleEmphasis: string

    contactNamePlaceholder: string
    contactEmailPlaceholder: string
    contactSubjectPlaceholder: string
    contactMessagePlaceholder: string
    contactSendLabel: string

    placeholderPicture: string
    placeholderArtistPhoto: string
  }
  myWork: {
    title: string
    searchPlaceholder: string
    carouselLogoPlaceholder: string
    carouselClientNamePlaceholder: string
  }
  clientsGallery: {
    title: string
    description: string
  }
  footer: {
    apronPlaceholder: string
    logoPrimary: string
    logoSecondary: string

    copyrightPrefix: string
    allRightsReservedSuffix: string

    poweredByPrefix: string
    poweredByName: string
  }
  login: {
    title: string
    subtitle: string

    usernameLabel: string
    usernamePlaceholder: string

    passwordLabel: string
    passwordPlaceholder: string

    submitLabel: string
    invalidCredentials: string
    defaultCredentialsNote: string
  }
}

export const defaultSiteText: SiteText = {
  navigation: {
    home: 'Home',
    journey: 'Journey',
    clients: 'Clients',
    myWork: 'My Work',
    creativeServices: 'Creative Services',
    letsConnect: "Let's Connect",
    login: 'Login'
  },
  home: {
    meetArtistTitle: 'Meet\nThe\nArtist',

    latestWorkTitle: 'Latest Work',
    latestWorkDescription:
      "Here's a glimpse of some of my latest projects & campaigns, showcasing the work I've been creating recently.",
    latestWorkCardCaption: 'Short explanation paragraph',

    myWorkTitle: 'My Work',
    searchPlaceholder: 'Search',

    carouselLogoPlaceholder: 'Logo Monogram',
    carouselClientNamePlaceholder: "Client's Name",

    servicesTitle: 'Creative Services',
    servicesDescription:
      'Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.',

    contactTitlePrefix: "Let's",
    contactTitleEmphasis: 'Connect',

    contactNamePlaceholder: 'Your Name',
    contactEmailPlaceholder: 'Your Email',
    contactSubjectPlaceholder: 'Subject',
    contactMessagePlaceholder: 'Message',
    contactSendLabel: 'Send',

    placeholderPicture: 'Picture',
    placeholderArtistPhoto: 'Artist Photo'
  },
  myWork: {
    title: 'My Work',
    searchPlaceholder: 'Search',
    carouselLogoPlaceholder: 'Logo Monogram',
    carouselClientNamePlaceholder: "Client's Name"
  },
  clientsGallery: {
    title: 'Clients Gallery',
    description: ''
  },
  footer: {
    apronPlaceholder: 'Apron Logo',
    logoPrimary: 'Andrea',
    logoSecondary: 'FoodStyle',

    copyrightPrefix: 'Copyright',
    allRightsReservedSuffix: 'All Rights Reserved',

    poweredByPrefix: 'Powered by',
    poweredByName: 'FourthDimension'
  },
  login: {
    title: 'Admin Login',
    subtitle: 'Welcome back! Please login to your account.',

    usernameLabel: 'Username',
    usernamePlaceholder: 'Enter your username',

    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',

    submitLabel: 'Login to Dashboard',
    invalidCredentials: 'Invalid credentials',
    defaultCredentialsNote: 'Default credentials: admin / admin123'
  }
}

const STORAGE_KEY = 'siteText'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepMerge<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) return base

  const result: Record<string, unknown> = { ...(base as unknown as Record<string, unknown>) }

  for (const [key, overrideValue] of Object.entries(override)) {
    const baseValue = (result as Record<string, unknown>)[key]

    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      ;(result as Record<string, unknown>)[key] = deepMerge(baseValue, overrideValue)
    } else {
      ;(result as Record<string, unknown>)[key] = overrideValue
    }
  }

  return result as T
}

export function loadSiteText(): SiteText {
  if (typeof window === 'undefined') return defaultSiteText

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultSiteText

    const parsed = JSON.parse(raw) as unknown
    return deepMerge(defaultSiteText, parsed)
  } catch {
    return defaultSiteText
  }
}

export function saveSiteText(text: SiteText): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(text))
}

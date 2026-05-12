export const defaultCategories = [
  { id: 1, name: 'TVC', description: 'Television Commercial projects', color: '#4a7ba7' },
  { id: 2, name: 'Photoshoot', description: 'Professional food photography', color: '#e89a3c' },
  { id: 3, name: 'Commercial', description: 'Commercial food styling', color: '#2ecc71' },
  { id: 4, name: 'Editorial', description: 'Editorial food photography', color: '#e74c3c' },
  { id: 5, name: 'Social Media', description: 'Social media content and campaign visuals', color: '#9b59b6' },
]

const fallbackColor = '#4a7ba7'

const isPlainObject = (value) => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
)

export const normalizeCategories = (value) => {
  if (!Array.isArray(value)) {
    return defaultCategories
  }

  return value
    .map((category, index) => {
      if (typeof category === 'string') {
        const name = category.trim()
        return {
          id: `category-${index}-${name}`,
          name,
          description: '',
          color: fallbackColor,
        }
      }

      if (!isPlainObject(category)) return null

      const name = typeof category.name === 'string' ? category.name.trim() : ''
      if (!name) return null

      return {
        id: category.id ?? `category-${index}-${name}`,
        name,
        description: typeof category.description === 'string' ? category.description : '',
        color: typeof category.color === 'string' && category.color ? category.color : fallbackColor,
      }
    })
    .filter(Boolean)
}

export const getCategoryNames = (value, options = {}) => {
  const names = normalizeCategories(value)
    .map((category) => category.name)
    .filter(Boolean)

  return options.includeAll ? ['All', ...names] : names
}

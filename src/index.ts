const configVariableCollectionName = 'fluidsize-inator config'
const classesVariableCollectionName = 'fluidsize-inator classes'

const maxModeName = 'Max size'

const configBaseVariables = [
  {
    name: 'Min Screen Size',
    key: 'minScreen',
    value: 400,
  },
  {
    name: 'Max Screen Size',
    key: 'maxScreen',
    value: 1920,
  },
]

const classesBaseVariables = [
  {
    name: 'BodyR/font-size',
    baseValue: 16,
    values: [
      {
        mode: maxModeName,
        value: 24,
      },
    ],
  },
  {
    name: 'BodyR/line-height',
    baseValue: 18,
    values: [
      {
        mode: maxModeName,
        value: 26,
      },
    ],
  },
]

const createButton = document.querySelector('.js-create-styles')
const statusText = document.querySelector('.js-status')
const stylesList = document.querySelector('.js-styles-list')

const getVariableCollectionNames = async () => {
  const variableCollections = await webflow.getAllVariableCollections()
  const variableCollectionNames = await Promise.all(
    variableCollections.map(collection => {
      return collection.getName()
    })
  )

  return variableCollectionNames
}

const getVariableCollectionByName = async name => {
  const variableCollections = await webflow.getAllVariableCollections()

  for (const collection of variableCollections) {
    const collectionName = await collection.getName()

    if (collectionName === name) {
      return collection
    }
  }
}

const createConfigVariableCollection = async () => {
  const variableCollection = await webflow.createVariableCollection(
    configVariableCollectionName
  )

  for (const variable of configBaseVariables) {
    await variableCollection.createNumberVariable(variable.name, variable.value)
  }
}

const createClassesVariableCollection = async () => {
  const variableCollection = await webflow.createVariableCollection(
    classesVariableCollectionName
  )

  await variableCollection.createVariableMode(maxModeName)

  return variableCollection
}

const createClassesVariables = async variableCollection => {
  const variableReferences = []

  // Get variable references, set base values
  for (const variable of classesBaseVariables) {
    const variableReference = await variableCollection.createNumberVariable(
      variable.name,
      variable.baseValue
    )

    variableReferences.push(variableReference)
  }

  // Set values for other modes
  const variableModes = await variableCollection.getAllVariableModes()

  for (const index in classesBaseVariables) {
    const variable = classesBaseVariables[index]
    const variableReference = variableReferences[index]

    for (const value of variable.values) {
      for (const mode of variableModes) {
        const modeName = await mode.getName()

        if (value.mode === modeName) {
          await variableReference.set(value.value, { mode })
        }
      }
    }
  }
}

const getMaxValue = async (variable, modes) => {
  for (const mode of modes) {
    const modeName = await mode.getName()

    if (modeName === maxModeName) {
      return variable.get({ mode })
    }
  }
}

const getSizesObjectFromVariables = async () => {
  const classesVariableCollection = await getVariableCollectionByName(
    classesVariableCollectionName
  )

  const setSizes = {}

  const classesVariables = await classesVariableCollection.getAllVariables()
  const variableModes = await classesVariableCollection.getAllVariableModes()

  for (const classVariable of classesVariables) {
    const variableName = await classVariable.getName()
    const sizeName = variableName.split('/')[0]
    const sizeProperty = variableName.split('/')[1]

    const minValue = await classVariable.get()
    const maxValue = await getMaxValue(classVariable, variableModes)

    if (!setSizes[sizeName]) {
      setSizes[sizeName] = {
        properties: [
          {
            name: sizeProperty,
            min: minValue,
            max: maxValue,
          },
        ],
      }
    } else {
      setSizes[sizeName].properties.push({
        name: sizeProperty,
        min: minValue,
        max: maxValue,
      })
    }
  }

  return setSizes
}

const getConfigObjectFromVariables: any = async () => {
  const configVariableCollection = await getVariableCollectionByName(
    configVariableCollectionName
  )

  const configVariables = await configVariableCollection.getAllVariables()

  const configObject = {}

  for (const variable of configVariables) {
    const variableName = await variable.getName()
    const variableValue = await variable.get()

    const variableKey = configBaseVariables.find(
      configVariable => configVariable.name === variableName
    ).key

    configObject[variableKey] = variableValue
  }

  return configObject
}

const getFluidCssString = (minSize, maxSize, minScreen, maxScreen) => {
  return `
    min(
      calc(${maxSize} * 1px),
      max(
        calc(${minSize} * 1px),
        calc(
          calc(${minSize} * 1px) + (${maxSize} - ${minSize}) *
            (
              (min(100vw, calc(100vh * 1.77777777778)) - calc(${minScreen} * 1px)) /
                (${maxScreen} - ${minScreen})
            )
        )
      )
    );
  `
}

const getStyleReference = async name => {
  const styleReference = await webflow.getStyleByName(name)

  if (styleReference) {
    return styleReference
  }

  return await webflow.createStyle(name)
}

const setStylesList = async () => {
  stylesList.innerHTML = '<li>...</li>'

  const sizes = await getSizesObjectFromVariables()
  const sizeNames = Object.keys(sizes)

  stylesList.innerHTML = ''

  for (const size of sizeNames) {
    const listItem = document.createElement('li')
    listItem.textContent = size

    stylesList.appendChild(listItem)
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  setStylesList()

  const variableCollectionNames = await getVariableCollectionNames()

  if (!variableCollectionNames.includes(configVariableCollectionName)) {
    await createConfigVariableCollection()
  }

  if (!variableCollectionNames.includes(classesVariableCollectionName)) {
    const variableCollection = await createClassesVariableCollection()

    await createClassesVariables(variableCollection)
  }
})

createButton.addEventListener('click', async () => {
  createButton.setAttribute('disabled', 'true')
  statusText.classList.remove(
    'extension__status--success',
    'extension__status--error'
  )

  try {
    const configFromVariables = await getConfigObjectFromVariables()

    const minScreen = configFromVariables.minScreen
    const maxScreen = configFromVariables.maxScreen

    const sizesFromVariables = await getSizesObjectFromVariables()

    const sizeNames = Object.keys(sizesFromVariables)

    for (const name of sizeNames) {
      const size = sizesFromVariables[name]
      const properties = size.properties

      const cssProperties = {}

      for (const property of properties) {
        const propertyName = property.name
        const cssValue =
          property.min === property.max
            ? property.min
            : getFluidCssString(
                property.min,
                property.max,
                minScreen,
                maxScreen
              )

        cssProperties[propertyName] = cssValue
      }

      const styleReference = await getStyleReference(name)

      await styleReference.setProperties(cssProperties)
    }
  } catch (e) {
    createButton.removeAttribute('disabled')

    statusText.classList.add('extension__status--error')
    statusText.textContent = 'error :('

    throw e
  }

  createButton.removeAttribute('disabled')

  statusText.classList.add('extension__status--success')
  statusText.textContent = 'success :)'
})

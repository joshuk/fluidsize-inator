var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const configVariableCollectionName = 'fluidsize-inator config';
const classesVariableCollectionName = 'fluidsize-inator classes';
const maxModeName = 'Max size';
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
];
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
];
const createButton = document.querySelector('.js-create-styles');
const statusText = document.querySelector('.js-status');
const stylesList = document.querySelector('.js-styles-list');
const getVariableCollectionNames = () => __awaiter(this, void 0, void 0, function* () {
    const variableCollections = yield webflow.getAllVariableCollections();
    const variableCollectionNames = yield Promise.all(variableCollections.map(collection => {
        return collection.getName();
    }));
    return variableCollectionNames;
});
const getVariableCollectionByName = (name) => __awaiter(this, void 0, void 0, function* () {
    const variableCollections = yield webflow.getAllVariableCollections();
    for (const collection of variableCollections) {
        const collectionName = yield collection.getName();
        if (collectionName === name) {
            return collection;
        }
    }
});
const createConfigVariableCollection = () => __awaiter(this, void 0, void 0, function* () {
    const variableCollection = yield webflow.createVariableCollection(configVariableCollectionName);
    for (const variable of configBaseVariables) {
        yield variableCollection.createNumberVariable(variable.name, variable.value);
    }
});
const createClassesVariableCollection = () => __awaiter(this, void 0, void 0, function* () {
    const variableCollection = yield webflow.createVariableCollection(classesVariableCollectionName);
    yield variableCollection.createVariableMode(maxModeName);
    return variableCollection;
});
const createClassesVariables = (variableCollection) => __awaiter(this, void 0, void 0, function* () {
    const variableReferences = [];
    // Get variable references, set base values
    for (const variable of classesBaseVariables) {
        const variableReference = yield variableCollection.createNumberVariable(variable.name, variable.baseValue);
        variableReferences.push(variableReference);
    }
    // Set values for other modes
    const variableModes = yield variableCollection.getAllVariableModes();
    for (const index in classesBaseVariables) {
        const variable = classesBaseVariables[index];
        const variableReference = variableReferences[index];
        for (const value of variable.values) {
            for (const mode of variableModes) {
                const modeName = yield mode.getName();
                if (value.mode === modeName) {
                    yield variableReference.set(value.value, { mode });
                }
            }
        }
    }
});
const getMaxValue = (variable, modes) => __awaiter(this, void 0, void 0, function* () {
    for (const mode of modes) {
        const modeName = yield mode.getName();
        if (modeName === maxModeName) {
            return variable.get({ mode });
        }
    }
});
const getSizesObjectFromVariables = () => __awaiter(this, void 0, void 0, function* () {
    const classesVariableCollection = yield getVariableCollectionByName(classesVariableCollectionName);
    const setSizes = {};
    const classesVariables = yield classesVariableCollection.getAllVariables();
    const variableModes = yield classesVariableCollection.getAllVariableModes();
    for (const classVariable of classesVariables) {
        const variableName = yield classVariable.getName();
        const sizeName = variableName.split('/')[0];
        const sizeProperty = variableName.split('/')[1];
        const minValue = yield classVariable.get();
        const maxValue = yield getMaxValue(classVariable, variableModes);
        if (!setSizes[sizeName]) {
            setSizes[sizeName] = {
                properties: [
                    {
                        name: sizeProperty,
                        min: minValue,
                        max: maxValue,
                    },
                ],
            };
        }
        else {
            setSizes[sizeName].properties.push({
                name: sizeProperty,
                min: minValue,
                max: maxValue,
            });
        }
    }
    return setSizes;
});
const getConfigObjectFromVariables = () => __awaiter(this, void 0, void 0, function* () {
    const configVariableCollection = yield getVariableCollectionByName(configVariableCollectionName);
    const configVariables = yield configVariableCollection.getAllVariables();
    const configObject = {};
    for (const variable of configVariables) {
        const variableName = yield variable.getName();
        const variableValue = yield variable.get();
        const variableKey = configBaseVariables.find(configVariable => configVariable.name === variableName).key;
        configObject[variableKey] = variableValue;
    }
    return configObject;
});
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
  `;
};
const getStyleReference = (name) => __awaiter(this, void 0, void 0, function* () {
    const styleReference = yield webflow.getStyleByName(name);
    if (styleReference) {
        return styleReference;
    }
    return yield webflow.createStyle(name);
});
const setStylesList = () => __awaiter(this, void 0, void 0, function* () {
    stylesList.innerHTML = '<li>...</li>';
    const sizes = yield getSizesObjectFromVariables();
    const sizeNames = Object.keys(sizes);
    stylesList.innerHTML = '';
    for (const size of sizeNames) {
        const listItem = document.createElement('li');
        listItem.textContent = size;
        stylesList.appendChild(listItem);
    }
});
document.addEventListener('DOMContentLoaded', () => __awaiter(this, void 0, void 0, function* () {
    setStylesList();
    const variableCollectionNames = yield getVariableCollectionNames();
    if (!variableCollectionNames.includes(configVariableCollectionName)) {
        yield createConfigVariableCollection();
    }
    if (!variableCollectionNames.includes(classesVariableCollectionName)) {
        const variableCollection = yield createClassesVariableCollection();
        yield createClassesVariables(variableCollection);
    }
}));
createButton.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
    createButton.setAttribute('disabled', 'true');
    statusText.classList.remove('extension__status--success', 'extension__status--error');
    try {
        const configFromVariables = yield getConfigObjectFromVariables();
        const minScreen = configFromVariables.minScreen;
        const maxScreen = configFromVariables.maxScreen;
        const sizesFromVariables = yield getSizesObjectFromVariables();
        const sizeNames = Object.keys(sizesFromVariables);
        for (const name of sizeNames) {
            const size = sizesFromVariables[name];
            const properties = size.properties;
            const cssProperties = {};
            for (const property of properties) {
                const propertyName = property.name;
                const cssValue = property.min === property.max
                    ? property.min
                    : getFluidCssString(property.min, property.max, minScreen, maxScreen);
                cssProperties[propertyName] = cssValue;
            }
            const styleReference = yield getStyleReference(name);
            yield styleReference.setProperties(cssProperties);
        }
    }
    catch (e) {
        createButton.removeAttribute('disabled');
        statusText.classList.add('extension__status--error');
        statusText.textContent = 'error :(';
        throw e;
    }
    createButton.removeAttribute('disabled');
    statusText.classList.add('extension__status--success');
    statusText.textContent = 'success :)';
}));

/** @odoo-module **/

export class FormManager {
    constructor(workflowBuilder) {
        this.workflow = workflowBuilder;
        this.state = workflowBuilder.state;
        this.notification = workflowBuilder.notification;
    }

    // Body Type Management
    updateBodyType(bodyType) {
        const nodeId = this.state.selectedNode;
        if (!nodeId) {
            console.error('❌ No node selected');
            return;
        }

        console.log('🔄 FormManager: Updating body type to:', bodyType);
        console.log('📋 Current node config:', this.state.nodeConfigs[nodeId]);

        // Update body type
        this.workflow.updateNodeConfig(nodeId, 'bodyType', bodyType);

        const nodeConfig = this.state.nodeConfigs[nodeId];

        // Initialize formFields if switching to form mode
        if (bodyType === 'form') {
            if (!nodeConfig.config.formFields || !Array.isArray(nodeConfig.config.formFields)) {
                this.workflow.updateNodeConfig('formFields', []);
                console.log('🆕 Initializing formFields array');
            }

            // Auto-add one empty field when switching to form mode
            if (nodeConfig.config.formFields.length === 0) {
                console.log('➕ Auto-adding first form field');
                this.addFormField();
            }

            // Convert existing JSON to form fields if available
            if (nodeConfig.config.body && nodeConfig.config.body.trim()) {
                this.convertJsonToForm();
            }
        }

        console.log('✅ FormManager: Body type updated. Current config:', nodeConfig.config);
    }

    // Form Field Management
    addFormField() {
        const nodeId = this.state.selectedNode;
        if (!nodeId) return;

        const nodeConfig = this.state.nodeConfigs[nodeId];

        // Ensure formFields array exists
        if (!nodeConfig.config.formFields) {
            nodeConfig.config.formFields = [];
        }

        // Add new empty field at the end
        nodeConfig.config.formFields.push({
            key: '',
            value: ''
        });

        console.log('➕ FormManager: Added form field. Total fields:', nodeConfig.config.formFields.length);
        this.state.configUpdateCounter++;

        // Auto-scroll to the new field
        setTimeout(() => {
            const formContainer = document.querySelector('.form-fields-container');
            if (formContainer) {
                formContainer.scrollTop = formContainer.scrollHeight;
            }
        }, 100);
    }

    updateFormField(index, fieldType, value) {
        const nodeId = this.state.selectedNode;
        if (!nodeId) return;

        const nodeConfig = this.state.nodeConfigs[nodeId];
        if (nodeConfig.config.formFields && nodeConfig.config.formFields[index]) {
            nodeConfig.config.formFields[index][fieldType] = value;
            console.log('✏️ FormManager: Updated form field:', { index, fieldType, value });
            this.state.configUpdateCounter++;
        }
    }

    removeFormField(index) {
        const nodeId = this.state.selectedNode;
        if (!nodeId) return;

        const nodeConfig = this.state.nodeConfigs[nodeId];
        if (nodeConfig.config.formFields && nodeConfig.config.formFields.length > index) {
            const removedField = nodeConfig.config.formFields.splice(index, 1);
            console.log('🗑️ FormManager: Removed form field:', removedField);
            this.state.configUpdateCounter++;

            // If no fields left, add one empty field
            if (nodeConfig.config.formFields.length === 0) {
                setTimeout(() => this.addFormField(), 100);
            }
        }
    }

    clearAllFormFields() {
        const nodeId = this.state.selectedNode;
        if (!nodeId) return;

        if (confirm("Are you sure you want to clear all form fields?")) {
            const nodeConfig = this.state.nodeConfigs[nodeId];
            nodeConfig.config.formFields = [];
            console.log('🧹 FormManager: Cleared all form fields');
            this.state.configUpdateCounter++;

            // Add one empty field after clearing
            setTimeout(() => this.addFormField(), 100);
        }
    }

    // Conversion Methods
    convertFormToJson() {
        const nodeId = this.state.selectedNode;
        if (!nodeId) return;

        const nodeConfig = this.state.nodeConfigs[nodeId];
        if (!nodeConfig.config.formFields || nodeConfig.config.formFields.length === 0) {
            this.notification.add("No form fields to convert", { type: 'warning' });
            return;
        }

        try {
            // Generate JSON from form fields
            const jsonObject = {};
            let hasValidFields = false;

            nodeConfig.config.formFields.forEach(field => {
                if (field.key && field.key.trim() !== '') {
                    hasValidFields = true;
                    const key = field.key.trim();
                    let value = field.value;

                    // Try to parse value as appropriate type
                    if (value === 'true') value = true;
                    else if (value === 'false') value = false;
                    else if (value === 'null') value = null;
                    else if (!isNaN(value) && value.trim() !== '') value = Number(value);
                    else if (value.trim() === '') value = '';

                    jsonObject[key] = value;
                }
            });

            if (!hasValidFields) {
                this.notification.add("No valid fields to convert", { type: 'warning' });
                return;
            }

            const jsonString = JSON.stringify(jsonObject, null, 2);
            this.updateNodeConfig(nodeId,'body', jsonString);
            this.updateNodeConfig(nodeId,'bodyType', 'json');

            console.log('📄 FormManager: Converted form to JSON:', jsonString);
            this.notification.add("Form data converted to JSON!", { type: 'success' });
        } catch (error) {
            console.error('❌ FormManager: Error converting form to JSON:', error);
            this.notification.add("Error converting form data", { type: 'danger' });
        }
    }

    convertJsonToForm() {
        const nodeId = this.state.selectedNode;
        if (!nodeId) return;

        const nodeConfig = this.state.nodeConfigs[nodeId];
        if (!nodeConfig.config.body || nodeConfig.config.body.trim() === '') {
            return;
        }

        try {
            const jsonObject = JSON.parse(nodeConfig.config.body);
            const formFields = [];

            // Convert JSON object to form fields
            Object.entries(jsonObject).forEach(([key, value]) => {
                formFields.push({
                    key: key,
                    value: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
                });
            });

            this.workflow.updateNodeConfig(nodeId, 'formFields', formFields);
            console.log('📋 FormManager: Converted JSON to form fields:', formFields);
            this.notification.add("JSON converted to form data!", { type: 'success' });
        } catch (error) {
            console.error('❌ FormManager: Error parsing JSON:', error);
            this.notification.add("Invalid JSON format - using empty form", { type: 'warning' });
            // Initialize with one empty form field if JSON is invalid
            this.workflow.updateNodeConfig('formFields', [{ key: '', value: '' }]);
        }
    }

    generateJsonFromForm(formFields) {
        if (!formFields || !Array.isArray(formFields) || formFields.length === 0) {
            return '{}';
        }

        const jsonObject = {};
        let hasValidFields = false;

        formFields.forEach(field => {
            if (field.key && field.key.trim() !== '') {
                hasValidFields = true;
                const key = field.key.trim();
                let value = field.value;

                // Try to parse value as appropriate type for preview
                if (value === 'true') value = true;
                else if (value === 'false') value = false;
                else if (value === 'null') value = null;
                else if (!isNaN(value) && value.trim() !== '') value = Number(value);
                else if (value.trim() === '') value = '';

                jsonObject[key] = value;
            }
        });

        if (!hasValidFields) {
            return '{}';
        }

        return JSON.stringify(jsonObject, null, 2);
    }

    // Utility Methods
    hasFormFields(nodeId) {
        const nodeConfig = this.state.nodeConfigs[nodeId];
        return nodeConfig &&
               nodeConfig.config &&
               nodeConfig.config.formFields &&
               Array.isArray(nodeConfig.config.formFields) &&
               nodeConfig.config.formFields.length > 0;
    }

    getFormFieldsCount(nodeId) {
        const nodeConfig = this.state.nodeConfigs[nodeId];
        return nodeConfig && nodeConfig.config && nodeConfig.config.formFields
            ? nodeConfig.config.formFields.length
            : 0;
    }

    // Validation Methods
    validateFormFields(nodeId) {
        const nodeConfig = this.state.nodeConfigs[nodeId];
        if (!nodeConfig || !nodeConfig.config.formFields) return { isValid: false, errors: [] };

        const errors = [];
        let hasValidFields = false;

        nodeConfig.config.formFields.forEach((field, index) => {
            if (field.key && field.key.trim() !== '') {
                hasValidFields = true;

                // Check for duplicate keys
                const duplicateIndex = nodeConfig.config.formFields.findIndex((f, i) =>
                    i !== index && f.key === field.key
                );
                if (duplicateIndex !== -1) {
                    errors.push(`Duplicate field name: "${field.key}"`);
                }
            }
        });

        return {
            isValid: hasValidFields && errors.length === 0,
            hasFields: hasValidFields,
            errors: errors
        };
    }

    // Template Generation
    getFormStructureTemplate(nodeConfig) {
        if (!nodeConfig || nodeConfig.config.bodyType !== 'form') {
            return '';
        }

        return `
            <div class="config-section">
                <div class="section-title">
                    <span class="section-icon">📋</span>
                    Form Data Structure
                </div>
                <div class="help-text">Add key-value pairs for your request body. These will be converted to JSON format.</div>

                <!-- Add Field Button at TOP -->
                <div class="form-header-actions">
                    <button class="add-form-field-btn top-add-btn"
                            t-on-click="formManager.addFormField">
                        ➕ Add New Field
                    </button>
                    <t t-if="formManager.hasFormFields(state.selectedNode)">
                        <button class="clear-all-fields-btn"
                                t-on-click="formManager.clearAllFormFields">
                            🗑️ Clear All
                        </button>
                    </t>
                </div>

                <!-- Form Fields List -->
                <div class="form-fields-container">
                    <t t-if="!formManager.hasFormFields(state.selectedNode)">
                        <div class="no-fields-message">
                            <div class="no-fields-icon">📝</div>
                            <h4>No Form Fields Added</h4>
                            <p>Click "Add New Field" above to start building your form data structure</p>
                        </div>
                    </t>

                    <t t-foreach="nodeConfig.config.formFields" t-as="field" t-key="field_index">
                        <div class="form-field-row">
                            <div class="form-field-header">
                                <span class="field-number">Field #<t t-esc="field_index + 1"/></span>
                                <button class="remove-form-field-btn"
                                        t-on-click="() => formManager.removeFormField(field_index)"
                                        title="Remove this field">
                                    🗑️ Remove
                                </button>
                            </div>
                            <div class="form-field-inputs">
                                <div class="input-group">
                                    <label class="input-label">Field Name (Key)</label>
                                    <input type="text"
                                           class="config-input form-field-key"
                                           placeholder="Enter field name (e.g., username, email, age)"
                                           t-att-value="field.key"
                                           t-on-input="(ev) => formManager.updateFormField(field_index, 'key', ev.target.value)"/>
                                </div>
                                <div class="input-group">
                                    <label class="input-label">Field Value</label>
                                    <input type="text"
                                           class="config-input form-field-value"
                                           placeholder="Enter field value (e.g., john_doe, user@example.com, 25)"
                                           t-att-value="field.value"
                                           t-on-input="(ev) => formManager.updateFormField(field_index, 'value', ev.target.value)"/>
                                </div>
                            </div>
                        </div>
                    </t>
                </div>

                <!-- Bottom Actions -->
                <t t-if="formManager.hasFormFields(state.selectedNode)">
                    <div class="form-footer-actions">
                        <button class="add-form-field-btn"
                                t-on-click="formManager.addFormField">
                            ➕ Add Another Field
                        </button>
                        <button class="convert-to-json-btn"
                                t-on-click="formManager.convertFormToJson">
                            🔄 Convert to JSON
                        </button>
                    </div>

                    <!-- JSON Preview -->
                    <div class="config-section">
                        <div class="section-title">
                            <span class="section-icon">👁️</span>
                            JSON Preview
                        </div>
                        <label class="config-label">Generated JSON</label>
                        <div class="json-preview">
                            <t t-esc="formManager.generateJsonFromForm(nodeConfig.config.formFields)"/>
                        </div>
                    </div>
                </t>
            </div>
        `;
    }
}
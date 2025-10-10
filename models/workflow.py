""" workflow testing model """
from odoo import models, fields, api, exceptions
import logging
import json

_logger = logging.getLogger(__name__)


class APIWorkflow(models.Model):
    _name = 'api.workflow'
    _inherit = ['api.workflow.testing']
    _description = 'API Workflow'

    name = fields.Char(string='Workflow Name', required=True)
    description = fields.Text(string='Description')
    workflow_data = fields.Text(string='Workflow Data')
    active = fields.Boolean(string='Active', default=True)
    created_date = fields.Datetime(string='Created Date', default=fields.Datetime.now)

    def open_workflow_builder(self):
        """
        Open the workflow builder with this workflow's data
        """
        print('open_workflow_builder')
        self.ensure_one()
        print(self.workflow_data)
        # Return action to open workflow builder
        return {
            'type': 'ir.actions.client',
            'tag': 'workflow_builder',
            'name': f'Workflow Builder - {self.name}',
            'params': {
                'workflow_id': self.id,
                'workflow_data': json.loads(self.workflow_data) if self.workflow_data else {},
                'workflow_name': self.name,
            },
            # 'target': 'fullscreen', # Optional: make it readonly
        }

    def test_workflow_from_record(self):
        """
        Test the workflow directly from the record
        """
        print('test_workflow_from_record')
        self.ensure_one()

        if not self.workflow_data:
            raise exceptions.UserError("No workflow data to test!")

        try:
            workflow_json = json.loads(self.workflow_data)
            result = self.test_workflow(workflow_json)

            # Show notification based on result
            if result.get('success'):
                message = f"Workflow test completed: {result.get('message', 'Success')}"
                message_type = 'success'
            else:
                message = f"Workflow test failed: {result.get('error', 'Unknown error')}"
                message_type = 'warning'

            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': 'Workflow Test Result',
                    'message': message,
                    'type': message_type,
                    'sticky': True,
                }
            }

        except Exception as e:
            raise exceptions.UserError(f"Failed to test workflow: {str(e)}")

    def load_workflow_to_builder(self):
        """
        Load this workflow into the workflow builder
        """
        print('load_workflow_to_builder')
        self.ensure_one()

        if not self.workflow_data:
            raise exceptions.UserError("No workflow data to load!")

        # Return client action to open workflow builder with this data
        return {
            'type': 'ir.actions.client',
            'tag': 'workflow_builder_action',  # Your workflow builder client action
            'params': {
                'workflow_data': self.workflow_data,
                'workflow_id': self.id,
            },
            'target': 'fullscreen',  # Open in full screen
        }

    @api.model
    def save_or_update_workflow(self, vals):
        """
        Unified create/update method for workflows.
        If 'id' is present, update that record.
        Otherwise, create a new workflow.
        """
        record_id = vals.get('id')
        workflow_data = vals.get('workflow_data')

        # Validate JSON
        if workflow_data:
            try:
                workflow_json = json.loads(workflow_data)
                if not workflow_json.get('nodes'):
                    raise exceptions.ValidationError("Workflow must contain at least one node")
                _logger.info("Parsed workflow JSON with %s nodes", len(workflow_json.get('nodes', [])))
            except json.JSONDecodeError as e:
                raise exceptions.ValidationError(("Invalid workflow data format: %s") % str(e))

        # 🧩 If ID exists → update existing record
        if record_id:
            existing = self.browse(record_id)
            if existing.exists():
                _logger.info("Updating existing workflow ID %s", record_id)
                existing.write(vals)
                return existing.id

        # 🆕 Otherwise → create a new workflow
        if not vals.get('name'):
            vals['name'] = self._generate_default_name()

        new_record = self.create(vals)
        _logger.info("Created new workflow ID %s", new_record.id)
        return new_record.id

    def _generate_default_name(self):
        """Generate a unique default name."""
        print('_generate_default_name')
        count = self.search_count([])
        return f"Workflow #{count + 1}"
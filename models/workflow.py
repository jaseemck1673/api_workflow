from odoo import models, fields, api


class APIWorkflow(models.Model):
    _name = 'api.workflow'
    _description = 'API Workflow'

    name = fields.Char(string='Workflow Name', required=True)
    description = fields.Text(string='Description')
    active = fields.Boolean(string='Active', default=True)
    created_date = fields.Datetime(string='Created Date', default=fields.Datetime.now)

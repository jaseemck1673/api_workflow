{
    'name': 'API Workflow Builder',
    'version': '18.0.1.0',
    'category': 'Tools',
    'summary': 'Drag and drop API workflow builder',
    'description': """
        Build API workflows visually with drag and drop interface.
        Create, test and manage API integrations easily.
    """,
    'depends': ['base', 'web'],
    'data': [
        'views/workflow_views.xml',
        'views/workflow_menu.xml',
        'security/ir.model.access.csv',
    ],
    'assets': {
        'web.assets_backend': [
            'api_workflow/static/src/xml/*',
            'api_workflow/static/src/css/*',
            'api_workflow/static/src/js/*',
            ],
    },

    'installable': True,
    'application': True,
    'license': 'LGPL-3',
}

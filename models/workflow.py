""" workflow testing model """
from odoo import models, fields, api, exceptions
from requests.auth import HTTPBasicAuth
import logging
import json
import requests

_logger = logging.getLogger(__name__)


class APIWorkflow(models.Model):
    _name = 'api.workflow'
    _description = 'API Workflow'

    name = fields.Char(string='Workflow Name', required=True)
    description = fields.Text(string='Description')
    workflow_data = fields.Text(string='Workflow Data')
    active = fields.Boolean(string='Active', default=True)
    created_date = fields.Datetime(string='Created Date', default=fields.Datetime.now)


    def _join_url(self, base, path):
        """
        Helper to join base URL and path cleanly.
        """
        print('join url', base)
        if not base:
            return path
        if not path:
            return base
        return f"{base.rstrip('/')}/{path.lstrip('/')}"

    def _test_url(self, url, headers=None):
        """
        Performs a GET request to the given URL and returns parsed JSON.
        """
        print('_test_url', url)
        if headers:
            print('headers')
            response = requests.get(url, headers=headers, timeout=10, verify=True)
        else:
            print('no header')
            response = requests.get(url, timeout=10, verify=True)
        response.raise_for_status()  # raises error if 4xx/5xx

        try:
            data = response.json()
            print('data', data)# Parse JSON response
        except ValueError:
            data = response.text  # If it's not JSON, return raw text

        _logger.info(f"API GET Response from {url}: {data}")
        return data


    @api.model
    def test_workflow(self, workflow_data):
        """
        Test workflow with authentication support
        """
        print('test_workflow', workflow_data)
        try:
            nodes = workflow_data.get('nodes', [])
            connections = workflow_data.get('connections', [])
            results = []

            # 1️⃣ Find endpoint node
            endpoint_node = next((n for n in nodes if n.get('type') == 'endpoint'), None)
            base_url = ''
            if endpoint_node:
                base_url = endpoint_node.get('config', {}).get('baseUrl', '').rstrip('/')

            # 2️⃣ Find all GET nodes connected directly to the endpoint node
            endpoint_id = endpoint_node['id'] if endpoint_node else None
            connected_get_nodes = []

            for conn in connections:
                if conn['target'] == endpoint_id:
                    # source is the GET node
                    source_node = next((n for n in nodes if n['id'] == conn['source']), None)
                    if source_node and source_node.get('type') == 'get':
                        connected_get_nodes.append(source_node)

            for node in connected_get_nodes:
                print('node', node)
                config = node.get('config', {})
                path = config.get('url', '')
                full_url = self._join_url(base_url, path)
                response_data = self._test_url(full_url)
                results.append({
                    'node_id': node['id'],
                    'node_type': node.get('type'),
                    'url': full_url,
                    'response': response_data
                })

                node_type = node.get('type', 'unknown')
                print('node_type', node_type)

                # Skip non-API nodes
                if node_type not in ['get', 'post', 'put', 'delete', 'endpoint']:
                    results.append({
                        'node_id': node['id'],
                        'node_type': node_type,
                        'status': 'skipped',
                        'message': 'Not an API node',
                        'url': None
                    })
                    continue

                # Get URL and authentication details
                url = config.get('url') or config.get('baseUrl')
                print('config', config)
                auth_type = config.get('authType', 'none')
                print('auth_type', auth_type)

                if not url:
                    results.append({
                        'node_id': node['id'],
                        'node_type': node_type,
                        'status': 'skipped',
                        'message': 'No URL found',
                        'url': None
                    })
                    continue

                # Make API call with authentication
                result = self._make_api_call_with_auth(url, node_type, config, auth_type)
                result['node_id'] = node['id']
                result['node_type'] = node_type
                results.append(result)

            return {
                'success': True,
                'message': f'Tested {len([r for r in results if r["status"] != "skipped"])} API nodes',
                'results': results
            }

        except Exception as e:
            _logger.error(f"Workflow test failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'results': []
            }

    def _make_api_call_with_auth(self, url, method, config, auth_type):
        """
        Make API call with authentication support
        """
        print('_make_api_call_with_auth', url)
        try:
            # Prepare headers
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'Odoo-API-Workflow/1.0'
            }

            # Add custom headers if any
            custom_headers = config.get('headers', [])
            for header in custom_headers:
                headers[header['key']] = header['value']

            # Prepare request parameters
            timeout = config.get('timeout', 10)
            verify_ssl = config.get('verify_ssl', True)

            # Prepare authentication
            auth = None
            if auth_type == 'basic':
                auth = self._setup_basic_auth(config)
            elif auth_type == 'bearer':
                headers = self._setup_bearer_auth(headers, config)
            elif auth_type == 'api-key':
                headers = self._setup_api_key_auth(headers, config)

            # Prepare request data
            data = None
            if method in ['post', 'put']:
                data = self._prepare_request_data(config)

            # Determine HTTP method
            http_method = method.upper() if method != 'endpoint' else 'GET'

            _logger.info(f"Making {http_method} request to: {url} with auth: {auth_type}")

            # Make the request
            response = requests.request(
                method=http_method,
                url=url,
                headers=headers,
                json=data,
                auth=auth,
                timeout=timeout,
                verify=verify_ssl
            )

            # Process response
            return self._process_response(response, url, http_method)

        except requests.exceptions.RequestException as e:
            return {
                'status': 'error',
                'message': f'Request failed: {str(e)}',
                'url': url,
                'method': method,
                'error': str(e),
                'status_code': None
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Unexpected error: {str(e)}',
                'url': url,
                'method': method,
                'error': str(e),
                'status_code': None
            }

    def _setup_basic_auth(self, config):
        """Setup Basic Authentication"""
        print('_setup_basic_auth', config)
        username = config.get('username', '')
        password = config.get('password', '')
        if username and password:
            return HTTPBasicAuth(username, password)
        return None

    def _setup_bearer_auth(self, headers, config):
        """Setup Bearer Token Authentication"""
        print('_setup_bearer_auth', headers, config)
        token = config.get('token', '')
        if token:
            headers['Authorization'] = f'Bearer {token}'
        return headers

    def _setup_api_key_auth(self, headers, config):
        """Setup API Key Authentication"""
        print('_setup_api_key_auth', headers, config)
        api_key = config.get('apiKey', '')
        key_location = config.get('keyLocation', 'header')
        key_name = config.get('keyName', 'X-API-Key')

        if api_key:
            if key_location == 'header':
                headers[key_name] = api_key
        return headers

    def _prepare_request_data(self, config):
        """Prepare request data for POST/PUT requests"""
        print('_prepare_request_data', config)
        body_content = config.get('body')
        if body_content:
            try:
                return json.loads(body_content)
            except json.JSONDecodeError:
                _logger.warning(f"Invalid JSON in request body: {body_content}")
                return body_content
        return None

    def _process_response(self, response, url, method):
        """Process the API response"""
        print('_process_response', response, url, method)
        try:
            response_data = response.json()
        except ValueError:
            response_data = response.text

        # Determine status based on HTTP status code
        if response.status_code < 400:
            status = 'success'
            message = f'HTTP {response.status_code} - {response.reason}'
        else:
            status = 'error'
            message = f'HTTP {response.status_code} - {response.reason}'

        return {
            'status': status,
            'message': message,
            'url': url,
            'method': method,
            'status_code': response.status_code,
            'response_data': response_data,
            'response_time': response.elapsed.total_seconds(),
            'headers': dict(response.headers)
        }

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

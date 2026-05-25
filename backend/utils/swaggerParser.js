const YAML = require('yamljs');

/**
 * Parses Swagger/OpenAPI JSON or YAML into a unified API structure.
 */
function parseSwagger(specContent) {
  let spec = null;
  const contentStr = typeof specContent === 'string' ? specContent.trim() : JSON.stringify(specContent);

  // Try JSON first
  try {
    spec = JSON.parse(contentStr);
  } catch (jsonErr) {
    // If not JSON, try YAML
    try {
      spec = YAML.parse(contentStr);
    } catch (yamlErr) {
      throw new Error('Invalid spec format: Content must be valid JSON or YAML');
    }
  }

  if (!spec || (!spec.swagger && !spec.openapi)) {
    throw new Error('Invalid specification: Missing "swagger" or "openapi" version definition.');
  }

  const endpoints = [];
  const paths = spec.paths || {};

  for (const path in paths) {
    const operations = paths[path];
    for (const method in operations) {
      // We only care about standard HTTP verbs
      if (!['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
        continue;
      }

      const operation = operations[method];
      const parameters = operation.parameters || [];
      const requestBody = operation.requestBody;

      // Extract details
      const parsedEndpoint = {
        path,
        method: method.toUpperCase(),
        summary: operation.summary || operation.description || `${method.toUpperCase()} ${path}`,
        parameters: parameters.map(p => ({
          name: p.name,
          in: p.in,
          required: !!p.required,
          type: p.schema ? p.schema.type : (p.type || 'string')
        })),
        requestBodySchema: extractRequestBodySchema(requestBody)
      };

      endpoints.push(parsedEndpoint);
    }
  }

  return {
    title: spec.info ? spec.info.title : 'API Spec',
    version: spec.info ? spec.info.version : '1.0.0',
    basePath: spec.basePath || '/',
    endpoints
  };
}

function extractRequestBodySchema(requestBody) {
  if (!requestBody || !requestBody.content) return null;
  
  const jsonContent = requestBody.content['application/json'];
  if (!jsonContent || !jsonContent.schema) return null;
  
  const schema = jsonContent.schema;
  if (schema.type === 'object' && schema.properties) {
    const props = {};
    for (const propName in schema.properties) {
      props[propName] = schema.properties[propName].type || 'string';
    }
    return props;
  }
  
  return { type: schema.type || 'object' };
}

module.exports = {
  parseSwagger
};

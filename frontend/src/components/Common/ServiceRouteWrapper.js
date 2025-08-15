import { useParams } from 'react-router-dom';
import { getServiceConfig, SERVICES_CONFIG } from '../../services/servicesConfig';
import GenericDocumentProcessor from './GenericDocumentProcessor';

const ServiceRouteWrapper = () => {
  console.log('🚀 ServiceRouteWrapper monté !');
  
  const { serviceId } = useParams();
  // Remet les - en _ pour matcher l'id de config
  const convertedServiceId = serviceId.replace(/-/g, '_');
  
  // Debug de l'import
  console.log('🔍 Import Debug:');
  console.log('  - getServiceConfig function:', typeof getServiceConfig);
  console.log('  - getServiceConfig importé:', !!getServiceConfig);
  
  // Debug de SERVICES_CONFIG
  console.log('🔍 SERVICES_CONFIG Debug:');
  console.log('  - SERVICES_CONFIG importé:', !!SERVICES_CONFIG);
  console.log('  - Clés disponibles:', Object.keys(SERVICES_CONFIG || {}));
  console.log('  - matching_cv_offre existe:', !!(SERVICES_CONFIG && SERVICES_CONFIG.matching_cv_offre));
  console.log('  - SERVICES_CONFIG complet:', SERVICES_CONFIG);
  console.log('  - Clés détaillées:', Object.keys(SERVICES_CONFIG || {}).join(', '));
  
  const config = getServiceConfig(convertedServiceId);
  
  console.log('🔍 ServiceRouteWrapper Debug:');
  console.log('  - URL serviceId:', serviceId);
  console.log('  - Converted serviceId:', convertedServiceId);
  console.log('  - Config trouvée:', !!config);
  console.log('  - Config ID:', config?.id);
  console.log('  - Config complète:', config);
  
  return <GenericDocumentProcessor serviceConfig={config} />;
};

export default ServiceRouteWrapper; 

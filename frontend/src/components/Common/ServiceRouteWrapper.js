import { useParams } from 'react-router-dom';
import { getServiceConfig, URL_TO_SERVICE_MAPPING } from '../../services/servicesConfig';
import GenericDocumentProcessor from './GenericDocumentProcessor';

const ServiceRouteWrapper = () => {
  const { serviceId } = useParams();

  // Convertir le slug d'URL en ID de service interne
  const convertedServiceId =
    URL_TO_SERVICE_MAPPING[serviceId] || serviceId.replace(/-/g, '_');

  const config = getServiceConfig(convertedServiceId);

  return <GenericDocumentProcessor serviceConfig={config} />;
};

export default ServiceRouteWrapper;

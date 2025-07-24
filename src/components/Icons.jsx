import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTachometerAlt,
    faUserGraduate,
    faUsers,
    faDollarSign,
    faFileAlt,
    faCog,
    faBars,
    faTrash,
    faEdit,
    faPlus,
    faTimes,
    faCalendarAlt,
    faClock,
    faChevronLeft,
    faChevronRight,
    faMinusCircle,
    faBuilding,
    faShoppingCart,
    faEye,
    faEyeSlash,
    faDownload,
    faUpload,
    faInfoCircle,
    faBirthdayCake,
    faBookOpen,
    faSave,
    faCheck,
    faExclamationTriangle,
    faExclamationCircle,
    faMoneyBillWave,
    faBriefcase,
    faUtensils,
    faChartLine,
    faSignOutAlt,
    faWallet,
    faArrowLeft,
    faExclamation,
    faCar,
    faBolt,
    faBullhorn,
    faTools,
    faShield,
    faCalculator,
    faHeart,
    faGraduationCap,
    faHome,
    faPlane,
    faMusic,
    faCamera,
    faGlobe,
    faCreditCard,
    faMobile,
    faSearch,
    faBell,
    faSpinner,
    faEnvelope,
    faList
} from '@fortawesome/free-solid-svg-icons';

export const Icon = ({ path, className = "" }) => {
    if (!path) {
        console.warn("Icon component received an undefined path.");
        return <FontAwesomeIcon icon={faExclamationCircle} className={className} />;
    }
    
    // Check if the icon is valid
    if (typeof path !== 'object' || !path.iconName) {
        console.warn("Icon component received an invalid path:", path);
        return <FontAwesomeIcon icon={faExclamationCircle} className={className} />;
    }
    
    try {
        return <FontAwesomeIcon icon={path} className={className} />;
    } catch (error) {
        console.error("Error rendering icon:", error, "Path:", path);
        return <FontAwesomeIcon icon={faExclamationCircle} className={className} />;
    }
};

export const ICONS = {
    DASHBOARD: faTachometerAlt,
    STUDENTS: faUserGraduate,
    GROUPS: faUsers,
    FINANCES: faDollarSign,
    DOCUMENTS: faFileAlt,
    SETTINGS: faCog,
    MENU: faBars,
    DELETE: faTrash,
    EDIT: faEdit,
    ADD: faPlus,
    CLOSE: faTimes,
    CALENDAR: faCalendarAlt,
    CLOCK: faClock,
    CHEVRON_LEFT: faChevronLeft,
    CHEVRON_RIGHT: faChevronRight,
    REMOVE_CIRCLE: faMinusCircle,
    BUILDING: faBuilding,
    SHOPPING_CART: faShoppingCart,
    EYE: faEye,
    EYE_OFF: faEyeSlash,
    DOWNLOAD: faDownload,
    UPLOAD: faUpload,
    INFO: faInfoCircle,
    CAKE: faBirthdayCake,
    LESSON: faBookOpen,
    SAVE: faSave,
    CHECK: faCheck,
    EXCLAMATION: faExclamationTriangle,
    INCOME: faMoneyBillWave,
    BUSINESS_EXPENSE: faBriefcase,
    PERSONAL_EXPENSE: faUtensils,
    PROFIT: faChartLine,
    LOGOUT: faSignOutAlt,
    WALLET: faWallet,
    WARNING: faExclamationTriangle,
    ARROW_LEFT: faArrowLeft,
    EXCLAMATION_CIRCLE: faExclamationCircle,
    CAR: faCar,
    BOLT: faBolt,
    BULLHORN: faBullhorn,
    TOOLS: faTools,
    SHIELD: faShield,
    CALCULATOR: faCalculator,
    HEART: faHeart,
    GRADUATION_CAP: faGraduationCap,
    HOME: faHome,
    PLANE: faPlane,
    MUSIC: faMusic,
    CAMERA: faCamera,
    GLOBE: faGlobe,
    CREDIT_CARD: faCreditCard,
    MOBILE: faMobile,
    BOOK_OPEN: faBookOpen,
    MONEY_BILL_WAVE: faMoneyBillWave,
    USER: faUserGraduate,
    USERS: faUsers,
    SEARCH: faSearch,
    BELL: faBell,
    LOADING: faSpinner,
    CHART_LINE: faChartLine,
    MESSAGE: faEnvelope,
    LIST: faList,
    UTENSILS: faUtensils
};
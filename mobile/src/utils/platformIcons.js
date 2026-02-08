import { Platform } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

// On web, provide simple text-based icons as fallback
// On native, use Material Community Icons
export const getIcon = (iconName, size = 24, color = '#000') => {
  if (Platform.OS === 'web') {
    // Simple emoji/text fallback icons for web
    const iconMap = {
      'home': '🏠',
      'book-open': '📖',
      'school': '🎓',
      'account': '👤',
      'bell': '🔔',
      'message': '💬',
      'settings': '⚙️',
      'logout': '🚪',
      'plus': '➕',
      'delete': '🗑️',
      'edit': '✏️',
      'check': '✓',
      'close': '✕',
      'menu': '☰',
      'search': '🔍',
      'chevron-right': '›',
      'calendar': '📅',
      'clock': '🕐',
    };
    return iconMap[iconName] || '•';
  }

  return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
};

export const Icon = ({
  name,
  size = 24,
  color = '#000',
  style,
  ...props
}) => {
  if (Platform.OS === 'web') {
    const iconMap = {
      'home': '🏠',
      'book-open': '📖',
      'school': '🎓',
      'account': '👤',
      'bell': '🔔',
      'message': '💬',
      'settings': '⚙️',
      'logout': '🚪',
      'plus': '➕',
      'delete': '🗑️',
      'edit': '✏️',
      'check': '✓',
      'close': '✕',
      'menu': '☰',
      'search': '🔍',
      'chevron-right': '›',
      'calendar': '📅',
      'clock': '🕐',
    };
    return (
      <Text style={[style, { fontSize: size, color }]} {...props}>
        {iconMap[name] || '•'}
      </Text>
    );
  }

  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={color}
      style={style}
      {...props}
    />
  );
};

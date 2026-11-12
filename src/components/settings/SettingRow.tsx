import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { LucideIcon, ChevronRight } from 'lucide-react-native';

interface SettingRowProps {
  label: string;
  icon: LucideIcon;
  type?: 'link' | 'switch' | 'button' | 'info';
  value?: boolean; // For switch
  onValueChange?: (val: boolean) => void; // For switch
  onPress?: () => void;
  subLabel?: string;
  color?: string; // Icon color
}

export const SettingRow: React.FC<SettingRowProps> = ({ 
  label, 
  icon: Icon, 
  type = 'link', 
  value, 
  onValueChange, 
  onPress,
  subLabel,
  color
}) => {
  const { colors } = useTheme();
  const iconColor = color || colors.primary;

  const content = (
    <View style={styles.container}>
      <View style={[styles.iconBox, { backgroundColor: iconColor + '15' }]}>
        <Icon size={20} color={iconColor} />
      </View>
      
      <View style={styles.textContainer}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        {subLabel && <Text style={[styles.subLabel, { color: colors.textSecondary }]}>{subLabel}</Text>}
      </View>

      <View style={styles.action}>
        {type === 'switch' && (
          <Switch 
            value={value} 
            onValueChange={onValueChange}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={'#fff'}
          />
        )}
        
        {type === 'link' && (
          <ChevronRight size={20} color={colors.textSecondary} />
        )}

        {type === 'info' && value && (
             <Text style={{ color: colors.textSecondary }}>{value}</Text>
        )}
      </View>
    </View>
  );

  if (type === 'switch' || type === 'info') {
    return <View style={[styles.wrapper, { borderColor: colors.border }]}>{content}</View>;
  }

  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[styles.wrapper, { borderColor: colors.border }]}
      activeOpacity={0.7}
    >
      {content}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
    paddingVertical: 16,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    paddingRight: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  subLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  action: {
    minWidth: 40,
    alignItems: 'flex-end',
  }
});
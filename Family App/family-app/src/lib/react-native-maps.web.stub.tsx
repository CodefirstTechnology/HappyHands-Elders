import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

/** Web stub so SSR and accidental imports do not load native map codegen. */
export const PROVIDER_GOOGLE = 'google';

type MapViewProps = ViewProps & {
  children?: ReactNode;
  initialRegion?: unknown;
  region?: unknown;
  provider?: string;
  googleMapId?: string;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  onPress?: (e: unknown) => void;
};

export default function MapView({ children, style }: MapViewProps) {
  return <View style={style}>{children}</View>;
}

export function Marker(_props: { coordinate?: unknown }) {
  return null;
}

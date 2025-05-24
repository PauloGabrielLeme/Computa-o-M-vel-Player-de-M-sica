import * as React from 'react';
import {
  TextInput,
  Text,
  View,
  Button,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';



Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class TelaMusicas extends React.Component {
  state = {
    musicas: [],
    loading: true,
    permissionError: false,
  };

  async componentDidMount() {
    await this.carregarMusicas();
  }

  async carregarMusicas() {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status !== 'granted') {
        this.setState({ permissionError: true, loading: false });
        return;
      }

      const media = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.audio,
        first: 100,
      });

      this.setState({
        musicas: media.assets,
        loading: false,
      });
    } catch (error) {
      console.log('Erro ao carregar músicas:', error);
      this.setState({ loading: false });
    }
  }

  renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.musicItem}
      onPress={() =>
        this.props.navigation.navigate('Player', { musica: item })
      }>
      <MaterialCommunityIcons name="music" size={24} color="#666" />
      <View style={styles.musicInfo}>
        <Text style={styles.musicName}>{item.filename}</Text>
        <Text style={styles.musicDuration}>
          {formatDuration(item.duration)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  render() {
    if (this.state.permissionError) {
      return (
        <View style={styles.container}>
          <Text style={styles.errorText}>
            Permissão para acessar músicas foi negada.
          </Text>
          <Button
            title="Tentar novamente"
            onPress={() => this.carregarMusicas()}
          />
        </View>
      );
    }

    return (
      <View style={styles.container}>
        {this.state.loading ? (
          <Text>Carregando músicas...</Text>
        ) : (
          <FlatList
            data={this.state.musicas}
            renderItem={this.renderItem}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text>Nenhuma música encontrada</Text>}
          />
        )}
      </View>
    );
  }
}

function formatDuration(millis) {
  const minutes = Math.floor(millis / 60000);
  const seconds = ((millis % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

class TelaAlbuns extends React.Component {
  state = {
    albuns: [],
    loading: true,
  };

  async componentDidMount() {
    await this.carregarAlbuns();
  }

  async carregarAlbuns() {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status !== 'granted') {
        this.setState({ loading: false });
        return;
      }

      const albums = await MediaLibrary.getAlbumsAsync();

      this.setState({
        albuns: albums,
        loading: false,
      });
    } catch (error) {
      console.log('Erro ao carregar álbuns:', error);
      this.setState({ loading: false });
    }
  }

  renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.albumItem}
      onPress={() =>
        this.props.navigation.navigate('MusicasDoAlbum', { album: item })
      }>
      <MaterialCommunityIcons name="album" size={24} color="#666" />
      <View style={styles.albumInfo}>
        <Text style={styles.albumName}>{item.title}</Text>
        <Text style={styles.albumCount}>{item.assetCount} músicas</Text>
      </View>
    </TouchableOpacity>
  );

  render() {
    return (
      <View style={styles.container}>
        {this.state.loading ? (
          <Text>Carregando álbuns...</Text>
        ) : (
          <FlatList
            data={this.state.albuns}
            renderItem={this.renderItem}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text>Nenhum álbum encontrado</Text>}
          />
        )}
      </View>
    );
  }
}

class TelaMusicasDoAlbum extends React.Component {
  state = {
    musicas: [],
    loading: true,
    album: null,
  };

  async componentDidMount() {
    const { album } = this.props.route.params;
    this.setState({ album });
    await this.carregarMusicasDoAlbum(album.id);
  }

  async carregarMusicasDoAlbum(albumId) {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status !== 'granted') {
        this.setState({ loading: false });
        return;
      }

      const albumAssets = await MediaLibrary.getAssetsAsync({
        album: albumId,
        mediaType: MediaLibrary.MediaType.audio,
        first: 100,
      });

      this.setState({
        musicas: albumAssets.assets,
        loading: false,
      });
    } catch (error) {
      console.log('Erro ao carregar músicas do álbum:', error);
      this.setState({ loading: false });
    }
  }

  renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.musicItem}
      onPress={() =>
        this.props.navigation.navigate('Player', { musica: item })
      }>
      <Text style={styles.musicName}>{item.filename}</Text>
      <Text style={styles.musicDuration}>
        {(item.duration / 60).toFixed(2)} min
      </Text>
    </TouchableOpacity>
  );

  render() {
    return (
      <View style={styles.container}>
        {this.state.loading ? (
          <Text>Carregando músicas...</Text>
        ) : (
          <>
            <Text style={styles.albumTitle}>{this.state.album.title}</Text>
            <FlatList
              data={this.state.musicas}
              renderItem={this.renderItem}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <Text>Nenhuma música encontrada neste álbum</Text>
              }
            />
          </>
        )}
      </View>
    );
  }
}

class TelaPlayer extends React.Component {
    state = {
    isPlaying: false,
    sound: null,
    position: 0,
    duration: 0,
    currentTrack: null,
    notificationSent: false,  
};

  async componentDidMount() {
    const { musica } = this.props.route.params;
    this.setState({ currentTrack: musica, duration: musica.duration });

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    });

    await this.loadAudio(musica);
  }
  async loadAudio(musica) {
  if (this.state.sound) {
    await this.state.sound.unloadAsync();
  }

  const { sound } = await Audio.Sound.createAsync(
    { uri: musica.uri },
    { shouldPlay: false },
    this.onPlaybackStatusUpdate
  );

  this.setState({ sound, notificationSent: false });  }

  async componentWillUnmount() {
    if (this.state.sound) {
      await this.state.sound.unloadAsync();
    }
  }

  async loadAudio(musica) {
    if (this.state.sound) {
      await this.state.sound.unloadAsync();
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: musica.uri },
      { shouldPlay: false },
      this.onPlaybackStatusUpdate
    );

    this.setState({ sound });
  }

  onPlaybackStatusUpdate = (status) => {
  if (status.isLoaded) {
    this.setState({
      position: status.positionMillis,
      duration: status.durationMillis || this.state.duration,
      isPlaying: status.isPlaying,
    });
  }
};


  async updateNotification() {
  if (this.state.notificationSent) return;  // se já enviou, sai

  const { currentTrack } = this.state;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Tocando agora',
      body: currentTrack.filename,
      sound: true,
      data: { uri: currentTrack.uri },
    },
    trigger: null,
  });

  this.setState({ notificationSent: true });  
}

  handlePlayPause = async () => {
  if (!this.state.sound) return;

  if (this.state.isPlaying) {
    await this.state.sound.pauseAsync();
  } else {
    await this.state.sound.playAsync();
    await this.updateNotification();  
  }
};


  render() {
    const { musica } = this.props.route.params;
    const { isPlaying, position, duration } = this.state;

    const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

    return (
      <View style={styles.playerContainer}>
        <Text style={styles.nowPlaying}>TOCANDO AGORA</Text>
        <View style={styles.albumArtPlaceholder}>
          <MaterialCommunityIcons name="music" size={100} color="#555" />
        </View>
        <Text style={styles.musicTitle}>{musica.filename}</Text>
        <Text style={styles.artistName}>Artista Desconhecido</Text>

        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarForeground,
              { width: `${progressPercent}%` },
            ]}
          />
        </View>

        <View style={styles.playerControls}>
          {/* Apenas o botão de pause/play */}
          <TouchableOpacity
            style={styles.playButton}
            onPress={this.handlePlayPause}>
            <MaterialCommunityIcons
              name={isPlaying ? 'pause' : 'play'}
              size={48}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

// Tela de cadastro
class Cadastro extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: undefined,
      password: undefined,
      confirmPassword: undefined,
    };
  }

  async gravar() {
    if (this.state.password !== this.state.confirmPassword) {
      alert('As senhas não coincidem!');
      return;
    }

    try {
      await AsyncStorage.setItem(this.state.user, this.state.password);
      alert('Cadastro realizado com sucesso!');
      this.props.navigation.navigate('Login');
    } catch (erro) {
      alert('Erro ao cadastrar!');
    }
  }

  render() {
    return (
      <View style={styles.authContainer}>
        <Text style={styles.authTitle}>Criar Conta</Text>

        <TextInput
          style={styles.authInput}
          placeholder="Usuário"
          onChangeText={(texto) => this.setState({ user: texto })}
        />

        <TextInput
          style={styles.authInput}
          placeholder="Senha"
          secureTextEntry={true}
          onChangeText={(texto) => this.setState({ password: texto })}
        />

        <TextInput
          style={styles.authInput}
          placeholder="Confirmar Senha"
          secureTextEntry={true}
          onChangeText={(texto) => this.setState({ confirmPassword: texto })}
        />

        <TouchableOpacity
          style={styles.authButton}
          onPress={() => this.gravar()}>
          <Text style={styles.authButtonText}>Cadastrar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.authLink}
          onPress={() => this.props.navigation.navigate('Login')}>
          <Text style={styles.authLinkText}>Já tem uma conta? Faça login</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

class Principal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      usuario: undefined,
      senha: undefined,
    };
  }

  async ler() {
    try {
      let senha = await AsyncStorage.getItem(this.state.usuario);
      if (senha != null) {
        if (senha == this.state.senha) {
          alert('Login realizado com sucesso!');
          this.props.navigation.navigate('MusicApp');
        } else {
          alert('Senha incorreta!');
        }
      } else {
        alert('Usuário não encontrado!');
      }
    } catch (erro) {
      console.log(erro);
      alert('Erro ao fazer login!');
    }
  }

  render() {
    return (
      <View style={styles.authContainer}>
        <Text style={styles.authTitle}>Login</Text>

        <TextInput
          style={styles.authInput}
          placeholder="Usuário"
          onChangeText={(texto) => this.setState({ usuario: texto })}
        />

        <TextInput
          style={styles.authInput}
          placeholder="Senha"
          secureTextEntry={true}
          onChangeText={(texto) => this.setState({ senha: texto })}
        />

        <TouchableOpacity style={styles.authButton} onPress={() => this.ler()}>
          <Text style={styles.authButtonText}>Entrar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.authLink}
          onPress={() => this.props.navigation.navigate('Cadastro')}>
          <Text style={styles.authLinkText}>
            Não tem uma conta? Cadastre-se
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const StackMusicas = createStackNavigator();
function MusicStack() {
  return (
    <StackMusicas.Navigator>
      <StackMusicas.Screen
        name="MusicApp"
        component={MusicTabs}
        options={{ headerShown: false }}
      />
      <StackMusicas.Screen
        name="Player"
        component={TelaPlayer}
        options={{ title: 'Reproduzindo' }}
      />
      <StackMusicas.Screen
        name="MusicasDoAlbum"
        component={TelaMusicasDoAlbum}
        options={({ route }) => ({ title: route.params.album.title })}
      />
    </StackMusicas.Navigator>
  );
}

const MusicTab = createBottomTabNavigator();
function MusicTabs() {
  return (
    <MusicTab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#6200EE',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#fff',
          paddingBottom: 5,
          height: 60,
        },
      }}>
      <MusicTab.Screen
        name="Álbuns"
        component={TelaAlbuns}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="album" color={color} size={size} />
          ),
        }}
      />
      <MusicTab.Screen
        name="Músicas"
        component={TelaMusicas}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="music" color={color} size={size} />
          ),
        }}
      />
    </MusicTab.Navigator>
  );
}

const MainStack = createStackNavigator();

function MainStackScreen() {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="AuthTabs" component={AuthTabs} />
      <MainStack.Screen name="MusicApp" component={MusicStack} />
    </MainStack.Navigator>
  );
}

const AuthTab = createBottomTabNavigator();
function AuthTabs() {
  return (
    <AuthTab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#6200EE',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#fff',
          paddingBottom: 5,
          height: 60,
        },
      }}>
      <AuthTab.Screen
        name="Login"
        component={Principal}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="login" color={color} size={size} />
          ),
        }}
      />
      <AuthTab.Screen
        name="Cadastro"
        component={Cadastro}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-plus"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </AuthTab.Navigator>
  );
}

class App extends React.Component {
  render() {
    return (
      <NavigationContainer>
        <MainStackScreen />
      </NavigationContainer>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#6200EE',
  },
  authInput: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  authButton: {
    backgroundColor: '#6200EE',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  authLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  authLinkText: {
    color: '#6200EE',
    fontSize: 14,
  },
  musicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  musicInfo: {
    marginLeft: 15,
    flex: 1,
  },
  musicName: {
    fontSize: 16,
    color: '#333',
  },
  musicDuration: {
    fontSize: 14,
    color: '#666',
    marginTop: 3,
  },
  albumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  albumInfo: {
    marginLeft: 15,
    flex: 1,
  },
  albumName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  albumCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 3,
  },
  albumTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 15,
    backgroundColor: '#f5f5f5',
    color: '#333',
  },
  playerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  nowPlaying: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#6200EE',
  },
  albumArtPlaceholder: {
    width: 150,
    height: 150,
    backgroundColor: '#eee',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  musicTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
    textAlign: 'center',
  },
  artistName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 25,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 25,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#ccc',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    backgroundColor: '#6200EE',
    borderRadius: 4,
    width: '50%',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    marginHorizontal: 20,
  },
  playButton: {
    backgroundColor: '#6200EE',
    padding: 15,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});



export default App;

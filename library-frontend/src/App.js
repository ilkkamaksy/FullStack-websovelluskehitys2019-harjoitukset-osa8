import React, { useState, useEffect } from 'react'
import { gql } from 'apollo-boost'
import { useQuery, useMutation, useSubscription, useApolloClient } from '@apollo/react-hooks';
import Authors from './components/Authors'
import Books from './components/Books'
import NewBook from './components/NewBook'
import EditAuthor from './components/EditAuthor'
import LoginForm from './components/LoginForm'
import Recommendations from './components/Recommendations'

const LOGIN = gql`
    mutation login($username: String!, $password: String!) {
      login(username: $username, password: $password)  {
        value
      }
    }
`
const USER = gql`
  {
    me {
      username
      favoriteGenre
    }
  }
`

const AUTHOR_DETAILS = gql`
  fragment AuthorDetails on Author {
    name
    born
    bookCount
    id
  }
`

const ALL_AUTHORS = gql`
  {
    allAuthors {
      ...AuthorDetails
    }
  }
${AUTHOR_DETAILS}
`
const BOOK_DETAILS = gql`
  fragment BookDetails on Book {
    title
    published
    author {
      name
    }
    genres
    id
  }
`

const ALL_BOOKS = gql`
  query allBooks($genre: String) {
    allBooks( genre: $genre ) {
      ...BookDetails
    }
}
${BOOK_DETAILS}
`

const CREATE_BOOK = gql`
mutation createBook($title: String!, $published: Int!, $author: String!, $genres: [String!]) {
  addBook(
    title: $title,
    published: $published,
    author: $author,
    genres: $genres
  ) {
    ...BookDetails
  }
}
${BOOK_DETAILS}
`
const EDIT_AUTHOR = gql`
  mutation editAuthor($name: String!, $born: Int!) {
    editAuthor(name: $name, setBornTo: $born) {
      ...AuthorDetails
    }
  }
${AUTHOR_DETAILS}
`
const BOOK_ADDED = gql`
  subscription {
    bookAdded {
      ...BookDetails
    }
  }
${BOOK_DETAILS}
`

const App = () => {

  const client = useApolloClient()

  // Set initial page 
  const [page, setPage] = useState('authors')
  
  // Handle errors
  const [errorMessage, setErrorMessage ] = useState(null)
  const handleError = (error) => {
    setErrorMessage(error.graphQLErrors[0].message)
    setTimeout(() => {
      setErrorMessage(null)
    }, 10000)
  }
  
  // Handle user login
  const [token, setToken] = useState(null)
  const [login] = useMutation(LOGIN, {
    onError: handleError
  })
  
  // Get the user
  const user = useQuery(USER, {
    onError: handleError
  })

  const handleLogin = (token) => {
    if ( token ) {
      setToken(token)
      user.refetch()
      setPage('authors')
    }  
  }

  // Handle user logout
  const logout = () => {
    setToken(null)
    localStorage.clear()
    client.resetStore()
    setPage('authors')  
  }

  // Get the token from localStorage
  useEffect(() => {
    const cachedToken = localStorage.getItem('library-user-token')
    if ( cachedToken ) {
      setToken(cachedToken)
    } 
  }, [])

  // Set selected genre
  const [genre, setGenre] = useState(null)
  const handleGenreSelect = (genre = null) => {
    setGenre(genre)
  }

  // Data queries
  const authors = useQuery(ALL_AUTHORS)
  const args = page === 'books' ? { variables: { genre } } : {}
  const books = useQuery(ALL_BOOKS, args)

  // Store a new added book to state
  const [ newBook, setNewBook ] = useState(null);

  // store all genres in state for book filters 
  const [genres, setGenres] = useState([])

  useEffect(() => {
    if (!books.loading && (genres.length === 0 || newBook) ) {
      books.data.allBooks.forEach(b => {
        b.genres.forEach(g => {
          if ( !genres.includes(g) ) {
            genres.push(g)
          }
        })
      })
      setNewBook(null)
      setGenres(genres)
    }
  }, [books, genres, page, genre, newBook])

  const notify = (content) => {
    window.alert(content)
  }
  
  // Subscribe to books added
  useSubscription(BOOK_ADDED, {
    onSubscriptionData: ({ subscriptionData }) => {
      const addedBook = subscriptionData.data.bookAdded
      notify(`${addedBook.title} added`)
      updateCacheWith(addedBook)

      setNewBook(addedBook)
    }
  })
  
  // Update cache when a book is added
  const updateCacheWith = (addedBook) => {
    const booksInStore = client.readQuery({ query: ALL_BOOKS })
    booksInStore.allBooks.push(addedBook)
    client.writeQuery({
        query: ALL_BOOKS,
        data: booksInStore
    })   
  }

  // Mutations
  const [addBook] = useMutation(CREATE_BOOK, {
    onError: handleError,
    update: (store, response) => {
      updateCacheWith(response.data.addBook)
    },
    refetchQueries: [{ query: ALL_AUTHORS }]
  })
  const [editAuthor] = useMutation(EDIT_AUTHOR)

  return (
    <div>
      <div>
        <button onClick={() => setPage('authors')}>authors</button>
        <button onClick={() => setPage('books')}>books</button>
        { token  && <button onClick={() => setPage('add')}>add book</button> } 
        { token  && <button onClick={() => setPage('editAuthor')}>edit author</button> } 
        { token  && <button onClick={() => setPage('recommendations')}>recommendations</button> } 
        { !token && <button onClick={() => setPage('login')}>login</button> }  
        { token  && <button onClick={() => logout()}>logout</button> }
      </div>

      {errorMessage && 
        <div>{errorMessage}</div>
      }

      <Recommendations 
          show={page === 'recommendations'}
          result={books}
          user={user}
          handleGenreSelect={handleGenreSelect}
      />

      <LoginForm
          show={page === 'login'}
          login={login}
          handleLogin={handleLogin}
        />

      <Authors
        show={page === 'authors'}
        result={authors}
      />

      <Books
        show={page === 'books'}
        result={books}
        handleGenreSelect={handleGenreSelect}
        genres={genres}
      />

      <NewBook
        show={page === 'add'}
        addBook={addBook}
      />

      <EditAuthor
        show={page === 'editAuthor'}
        result={authors}
        editAuthor={editAuthor}
      />

    </div>
  )
}

export default App
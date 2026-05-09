import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import './App.css'

type User = {
  id: number
  firstName: string
  lastName: string
  maidenName: string
  age: number
  gender: string
  email: string
  phone: string
  username: string
  birthDate: string
  image: string
  bloodGroup: string
  height: number
  weight: number
  eyeColor: string
  hair: {
    color: string
    type: string
  }
  address: {
    address: string
    city: string
    state: string
    country: string
  }
  university: string
  company: {
    department: string
    name: string
    title: string
  }
  role: string
}

type UsersResponse = {
  users: User[]
  total: number
  skip: number
  limit: number
}

type SortKey = 'name' | 'age' | 'company'

const USERS_API = 'https://dummyjson.com/users?limit=100'

async function fetchUsers() {
  const response = await fetch(USERS_API)

  if (!response.ok) {
    throw new Error('Не удалось загрузить пользователей')
  }

  return response.json() as Promise<UsersResponse>
}

function fullName(user: User) {
  return `${user.firstName} ${user.lastName}`
}

function App() {
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('all')
  const [sortBy, setSortBy] = useState<SortKey>('name')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const { data, error, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  })

  const users = useMemo(() => data?.users ?? [], [data])

  const departments = useMemo(() => {
    return Array.from(new Set(users.map((user) => user.company.department))).sort()
  }, [users])

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return users
      .filter((user) => {
        const matchesSearch = [
          fullName(user),
          user.email,
          user.username,
          user.company.name,
          user.company.title,
          user.address.city,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch)

        const matchesDepartment =
          department === 'all' || user.company.department === department

        return matchesSearch && matchesDepartment
      })
      .sort((a, b) => {
        if (sortBy === 'age') {
          return a.age - b.age
        }

        if (sortBy === 'company') {
          return a.company.name.localeCompare(b.company.name)
        }

        return fullName(a).localeCompare(fullName(b))
      })
  }, [department, search, sortBy, users])

  const stats = useMemo(() => {
    const averageAge =
      users.length === 0
        ? 0
        : Math.round(users.reduce((sum, user) => sum + user.age, 0) / users.length)

    return {
      total: users.length,
      visible: filteredUsers.length,
      departments: departments.length,
      averageAge,
    }
  }, [departments.length, filteredUsers.length, users])

  return (
    <main className="dashboard">
      <section className="topbar" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">DummyJSON Users API</p>
          <h1 id="page-title">Пользователи компании</h1>
          <p className="lead">
            Единый экран для просмотра команды: контакты, роли, отделы и быстрый
            доступ к подробностям профиля.
          </p>
        </div>
        <button
          className="refresh-button"
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          {isFetching ? 'Обновляю' : 'Обновить'}
        </button>
      </section>

      <section className="stats-grid" aria-label="Сводка пользователей">
        <article className="stat-card">
          <span>Всего</span>
          <strong>{stats.total}</strong>
          <small>загружено из API</small>
        </article>
        <article className="stat-card">
          <span>На экране</span>
          <strong>{stats.visible}</strong>
          <small>после фильтров</small>
        </article>
        <article className="stat-card">
          <span>Отделы</span>
          <strong>{stats.departments}</strong>
          <small>уникальных направлений</small>
        </article>
        <article className="stat-card">
          <span>Средний возраст</span>
          <strong>{stats.averageAge}</strong>
          <small>лет</small>
        </article>
      </section>

      <section className="panel" aria-label="Список пользователей">
        <div className="controls">
          <label className="search-field">
            <span>Поиск</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Имя, email, компания, город"
              type="search"
            />
          </label>

          <label>
            <span>Отдел</span>
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            >
              <option value="all">Все отделы</option>
              {departments.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Сортировка</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortKey)}
            >
              <option value="name">По имени</option>
              <option value="age">По возрасту</option>
              <option value="company">По компании</option>
            </select>
          </label>
        </div>

        {isLoading && (
          <div className="user-list" aria-label="Загрузка пользователей">
            {Array.from({ length: 8 }, (_, index) => (
              <div className="skeleton-row" key={index} />
            ))}
          </div>
        )}

        {isError && (
          <div className="empty-state" role="alert">
            <strong>Не получилось загрузить данные</strong>
            <p>{error instanceof Error ? error.message : 'Попробуйте еще раз.'}</p>
            <button type="button" onClick={() => void refetch()}>
              Повторить
            </button>
          </div>
        )}

        {!isLoading && !isError && filteredUsers.length === 0 && (
          <div className="empty-state">
            <strong>Ничего не найдено</strong>
            <p>Измените поиск или сбросьте фильтр отдела.</p>
          </div>
        )}

        {!isLoading && !isError && filteredUsers.length > 0 && (
          <div className="user-list">
            <div className="table-head" aria-hidden="true">
              <span>Пользователь</span>
              <span>Компания</span>
              <span>Локация</span>
              <span>Контакты</span>
            </div>

            {filteredUsers.map((user, index) => (
              <button
                className="user-row"
                key={user.id}
                style={{ animationDelay: `${Math.min(index * 24, 360)}ms` }}
                type="button"
                onClick={() => setSelectedUser(user)}
              >
                <span className="profile-cell">
                  <img src={user.image} alt="" loading="lazy" />
                  <span>
                    <strong>{fullName(user)}</strong>
                    <small>@{user.username}</small>
                  </span>
                </span>
                <span>
                  <strong>{user.company.title}</strong>
                  <small>{user.company.name}</small>
                </span>
                <span>
                  <strong>{user.address.city}</strong>
                  <small>{user.address.country}</small>
                </span>
                <span>
                  <strong>{user.email}</strong>
                  <small>{user.phone}</small>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedUser && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setSelectedUser(null)}
        >
          <section
            className="profile-modal"
            aria-label={`Профиль ${fullName(selectedUser)}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="close-button"
              type="button"
              aria-label="Закрыть профиль"
              onClick={() => setSelectedUser(null)}
            >
              x
            </button>
            <header>
              <img src={selectedUser.image} alt="" />
              <div>
                <p>{selectedUser.company.department}</p>
                <h2>{fullName(selectedUser)}</h2>
                <span>{selectedUser.company.title}</span>
              </div>
            </header>
            <div className="details-grid">
              <div>
                <span>Email</span>
                <strong>{selectedUser.email}</strong>
              </div>
              <div>
                <span>Телефон</span>
                <strong>{selectedUser.phone}</strong>
              </div>
              <div>
                <span>Возраст</span>
                <strong>{selectedUser.age}</strong>
              </div>
              <div>
                <span>Роль</span>
                <strong>{selectedUser.role}</strong>
              </div>
              <div>
                <span>Адрес</span>
                <strong>
                  {selectedUser.address.address}, {selectedUser.address.city}
                </strong>
              </div>
              <div>
                <span>Университет</span>
                <strong>{selectedUser.university}</strong>
              </div>
              <div>
                <span>Внешность</span>
                <strong>
                  {selectedUser.eyeColor} eyes, {selectedUser.hair.color}{' '}
                  {selectedUser.hair.type} hair
                </strong>
              </div>
              <div>
                <span>Группа крови</span>
                <strong>{selectedUser.bloodGroup}</strong>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default App

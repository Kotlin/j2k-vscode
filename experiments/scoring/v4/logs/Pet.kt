
/*
 * Copyright 2012-2025 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.springframework.samples.petclinic.owner

import java.time.LocalDate
import java.util.LinkedHashSet
import java.util.Set

import org.springframework.format.annotation.DateTimeFormat
import org.springframework.samples.petclinic.model.NamedEntity

import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.OneToMany
import jakarta.persistence.OrderBy
import jakarta.persistence.Table

/**
 * Simple business object representing a pet.
 *
 * @author Ken Krebs
 * @author Juergen Hoeller
 * @author Sam Brannen
 * @author Wick Dynex
 */
@Entity
@Table(name = "pets")
open class Pet : NamedEntity() {

    @field:Column(name = "birth_date")
    @field:DateTimeFormat(pattern = "yyyy-MM-dd")
    var birthDate: LocalDate? = null

    @field:ManyToOne
    @field:JoinColumn(name = "type_id")
    var type: PetType? = null

    @field:OneToMany(cascade = [CascadeType.ALL], fetch = FetchType.EAGER)
    @field:JoinColumn(name = "pet_id")
    @field:OrderBy("date ASC")
    val visits: LinkedHashSet<Visit> = LinkedHashSet()

    fun setBirthDate(birthDate: LocalDate?) {
        this.birthDate = birthDate
    }

    fun getBirthDate(): LocalDate? = birthDate

    fun getType(): PetType? = type

    fun setType(type: PetType?) {
        this.type = type
    }

    fun getVisits(): Set<Visit> = visits

    fun addVisit(visit: Visit) {
        visits += visit
    }
}
